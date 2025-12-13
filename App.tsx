import React, { useState, useEffect } from 'react';
import { Scene, User, AppState, UserStats } from './types';
import { generateStoryDraft, generateScenesFromStory } from './services/geminiService';
import { Button } from './components/Button';
import { SceneCard } from './components/SceneCard';
import { jwtDecode } from 'jwt-decode';

// Mock Data for Admin Panel Simulation
const INITIAL_MOCK_DB: UserStats[] = [
  { id: '1', email: "alice@studio.com", name: "Alice Director", avatar: "https://picsum.photos/100/100?random=1", storiesGenerated: 42, totalScenesGenerated: 520, lastActive: "2023-10-24 14:30", role: 'user' },
  { id: '2', email: "bob@creative.net", name: "Bob Writer", avatar: "https://picsum.photos/100/100?random=2", storiesGenerated: 15, totalScenesGenerated: 180, lastActive: "2023-10-25 09:15", role: 'user' },
  { id: '3', email: "charlie@video.io", name: "Charlie Motion", avatar: "https://picsum.photos/100/100?random=3", storiesGenerated: 8, totalScenesGenerated: 96, lastActive: "2023-10-26 11:00", role: 'user' },
  { id: '4', email: "demo.user@gmail.com", name: "Creative Director", avatar: "https://picsum.photos/100/100?random=4", storiesGenerated: 0, totalScenesGenerated: 0, lastActive: "Now", role: 'user' }
];

const MOCK_USER: User = {
  email: "demo.user@gmail.com",
  name: "Creative Director",
  avatar: "https://picsum.photos/100/100?random=4"
};

// --- Error Handling Helper ---
const getFriendlyErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  console.warn("App Error Details:", message); // Log for debugging

  // Configuration Errors
  if (message.includes("API Key is missing")) {
    return "Configuration Error: The API Key is missing. Please check your environment settings.";
  }
  
  // Rate Limits (HTTP 429)
  if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("exhausted")) {
    return "Usage Limit Exceeded: The AI service is currently busy or you have hit your rate limit. Please wait a minute and try again.";
  }

  // Authentication/Permission (HTTP 400/403)
  if (message.includes("400") || message.includes("403") || message.includes("API key not valid")) {
    return "Authentication Error: The provided API key is invalid or has expired.";
  }

  // Server Errors (HTTP 500/503)
  if (message.includes("500") || message.includes("503") || message.toLowerCase().includes("overloaded")) {
    return "Service Unavailable: Google's AI servers are currently overloaded. Please try again shortly.";
  }

  // Network Issues
  if (message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network") || message.toLowerCase().includes("failed to connect")) {
    return "Connection Error: Unable to reach the AI service. Please check your internet connection.";
  }

  // Data/Parsing Issues
  if (message.includes("JSON") || message.includes("SyntaxError") || message.includes("Unexpected token")) {
    return "Data Processing Error: The AI failed to generate valid structured data. Retrying usually fixes this.";
  }

  // Safety Filters
  if (message.toLowerCase().includes("safety") || message.toLowerCase().includes("blocked") || message.includes("candidate")) {
    return "Content Blocked: The request was flagged by safety filters. Please try modifying your topic or prompt.";
  }

  // Fallback
  return `An unexpected error occurred: ${message.slice(0, 150)}${message.length > 150 ? '...' : ''}`;
};

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  
  // Login Configuration State
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return (typeof process !== 'undefined' && process.env && process.env.GOOGLE_CLIENT_ID) || '';
  });
  const [showClientConfig, setShowClientConfig] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // App Logic State
  const [topic, setTopic] = useState('');
  const [customDialogue, setCustomDialogue] = useState('');
  const [duration, setDuration] = useState<number>(1);
  const [storyDraft, setStoryDraft] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [allowVariations, setAllowVariations] = useState(false);

  // Admin State
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [userDb, setUserDb] = useState<UserStats[]>(INITIAL_MOCK_DB);

  // --- Login Effects ---

  useEffect(() => {
    // Check if we have a client ID and if the Google script is loaded
    if (appState === AppState.LOGIN && googleClientId && (window as any).google) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });
        
        const btnContainer = document.getElementById("google-btn-container");
        if (btnContainer) {
            (window as any).google.accounts.id.renderButton(
                btnContainer,
                { theme: "outline", size: "large", width: "100%", text: "continue_with" }
            );
        }
      } catch (e) {
        console.error("GSI Initialization Error:", e);
        setLoginError("Failed to initialize Google Sign-In.");
      }
    }
  }, [appState, googleClientId, showClientConfig]);

  const handleGoogleCredentialResponse = (response: any) => {
    try {
        const decoded: any = jwtDecode(response.credential);
        setUser({
            email: decoded.email,
            name: decoded.name,
            avatar: decoded.picture
        });
        setAppState(AppState.INPUT);
        updateUserActivity(decoded.email);
    } catch (e) {
        console.error("Token Decode Error:", e);
        setLoginError("Failed to sign in. Token invalid.");
    }
  };

  // --- Actions ---

  const handleDemoLogin = () => {
    // Simulate Google Login Process
    setTimeout(() => {
      setUser(MOCK_USER);
      setAppState(AppState.INPUT);
      updateUserActivity(MOCK_USER.email);
    }, 800);
  };

  const updateUserActivity = (email: string, scenesCount: number = 0) => {
    setUserDb(prev => prev.map(u => {
      if (u.email === email) {
        return {
          ...u,
          lastActive: "Just now",
          storiesGenerated: scenesCount > 0 ? u.storiesGenerated + 1 : u.storiesGenerated,
          totalScenesGenerated: u.totalScenesGenerated + scenesCount
        };
      }
      return u;
    }));
  };

  const handleLogout = () => {
    setUser(null);
    setAppState(AppState.LOGIN);
    setScenes([]);
    setTopic('');
    setCustomDialogue('');
    setStoryDraft('');
    setDuration(1);
    setAllowVariations(false);
  };

  const handleGenerateDraft = async () => {
    if (!topic.trim()) return;
    
    // Ensure duration is valid for the API call (at least 1 min)
    const safeDuration = duration <= 0 ? 1 : duration;

    setAppState(AppState.GENERATING_STORY);
    setError(null);
    
    try {
      const draft = await generateStoryDraft(topic, customDialogue, safeDuration);
      setStoryDraft(draft);
      setAppState(AppState.STORY_REVIEW);
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyErrorMessage(err);
      setError(friendlyMsg);
      // We remain on INPUT state so user can retry immediately
      setAppState(AppState.INPUT);
    }
  };

  const handleGenerateScenes = async () => {
    if (!storyDraft.trim()) return;

    setAppState(AppState.GENERATING_SCENES);
    setError(null);

    // Ensure duration is valid for the API call (at least 1 min)
    const safeDuration = duration <= 0 ? 1 : duration;

    try {
      const generatedScenes = await generateScenesFromStory(storyDraft, safeDuration, allowVariations);
      setScenes(generatedScenes);
      
      // Update Stats for Admin
      if (user) {
        updateUserActivity(user.email, generatedScenes.length);
      }

      setAppState(AppState.RESULTS);
    } catch (err: unknown) {
        const friendlyMsg = getFriendlyErrorMessage(err);
        setError(friendlyMsg);
        // We remain on STORY_REVIEW state so user can tweak the story or just retry
        setAppState(AppState.STORY_REVIEW);
    }
  };

  const handleDownloadAll = () => {
    const blob = new Blob([JSON.stringify(scenes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `story-flow-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to start a new story? Your current storyboard will be lost.")) {
      setAppState(AppState.INPUT);
      setTopic('');
      setCustomDialogue('');
      setStoryDraft('');
      setDuration(1);
      setScenes([]);
    }
  };

  const handleBackToInput = () => {
     setAppState(AppState.INPUT);
  };

  // --- Admin Actions ---

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'Veo816209') {
      setAppState(AppState.ADMIN_DASHBOARD);
      setAdminError('');
      setAdminPassword('');
    } else {
      setAdminError('Invalid access code.');
    }
  };

  const handleExitAdmin = () => {
    setAppState(AppState.LOGIN);
    setAdminPassword('');
    setAdminError('');
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this user?")) {
      setUserDb(prev => prev.filter(u => u.id !== userId));
    }
  };

  // --- Views ---

  if (appState === AppState.LOGIN) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">StoryFlow Builder</h1>
            <p className="text-slate-400">Transform ideas into structured video clips for Google Flow.</p>
          </div>
          
          <div className="space-y-4 mb-6">
            {googleClientId ? (
                <div id="google-btn-container" className="h-12 w-full flex justify-center"></div>
            ) : (
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-center">
                    <p className="text-sm text-slate-400 mb-3">
                        To enable real Google Sign-In, you must provide a valid Client ID.
                    </p>
                    <button 
                        onClick={() => setShowClientConfig(true)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium underline"
                    >
                        Configure Client ID
                    </button>
                </div>
            )}

            {!googleClientId && (
                <button 
                    onClick={handleDemoLogin}
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 px-4 rounded-xl flex items-center justify-center transition-all duration-200 group"
                >
                    <span className="mr-2">⚡</span>
                    Try Demo Mode
                </button>
            )}

            {showClientConfig && !googleClientId && (
                <div className="mt-4 p-4 bg-slate-700/30 rounded-lg animate-fade-in">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Google Client ID</label>
                    <input 
                        type="text" 
                        placeholder="782...apps.googleusercontent.com"
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white mb-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                        onChange={(e) => setGoogleClientId(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-500">
                        This ID is stored in memory only. Create one in Google Cloud Console &#62; APIs & Services &#62; Credentials.
                    </p>
                </div>
            )}
          </div>

          {loginError && (
              <p className="text-red-400 text-sm text-center mb-4">{loginError}</p>
          )}
          
          <div className="border-t border-slate-700 pt-6 mt-4">
            <button 
              onClick={() => setAppState(AppState.ADMIN_LOGIN)}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors w-full text-center flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Admin Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appState === AppState.ADMIN_LOGIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-sm w-full bg-slate-900 rounded-xl p-8 border border-slate-800 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Admin Portal</h2>
          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Access Code</label>
              <input 
                type="password" 
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-600"
                placeholder="Enter password..."
                autoFocus
              />
            </div>
            {adminError && <p className="text-red-500 text-sm">{adminError}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={handleExitAdmin} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1">Login</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (appState === AppState.ADMIN_DASHBOARD) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-900 rounded flex items-center justify-center text-indigo-400 font-bold">A</div>
             <h1 className="text-xl font-bold text-white">Administrator Dashboard</h1>
          </div>
          <Button variant="ghost" onClick={handleExitAdmin} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>}>
            Exit Panel
          </Button>
        </header>

        <main className="max-w-6xl mx-auto p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
               <h3 className="text-slate-500 text-sm font-medium uppercase">Total Users</h3>
               <p className="text-3xl font-bold text-white mt-2">{userDb.length}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
               <h3 className="text-slate-500 text-sm font-medium uppercase">Total Stories Created</h3>
               <p className="text-3xl font-bold text-indigo-400 mt-2">
                 {userDb.reduce((acc, curr) => acc + curr.storiesGenerated, 0)}
               </p>
            </div>
             <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
               <h3 className="text-slate-500 text-sm font-medium uppercase">System Status</h3>
               <div className="flex items-center gap-2 mt-2">
                 <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="text-white font-medium">Operational</span>
               </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">User Activity Log</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 uppercase font-medium">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4 text-center">Stories</th>
                    <th className="px-6 py-4 text-center">Total Clips</th>
                    <th className="px-6 py-4 text-right">Last Active</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {userDb.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={u.avatar} alt="" className="w-8 h-8 rounded-full bg-slate-700" />
                          <div>
                            <div className="font-medium text-white">{u.name}</div>
                            <div className="text-slate-500 text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-indigo-300">
                        {u.storiesGenerated}
                      </td>
                       <td className="px-6 py-4 text-center font-mono text-slate-300">
                        {u.totalScenesGenerated}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400">
                        {u.lastActive}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-900/10"
                          title="Delete User"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isGenerating = appState === AppState.GENERATING_STORY || appState === AppState.GENERATING_SCENES;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                 <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                 </svg>
               </div>
               <span className="text-xl font-bold text-white">StoryFlow</span>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                  <img src={user.avatar} alt="Avatar" className="w-6 h-6 rounded-full" />
                  <span className="text-sm font-medium text-slate-300 hidden sm:inline">{user.email}</span>
                  <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-400 ml-2">Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Step 1: Input Phase */}
        {(appState === AppState.INPUT || appState === AppState.GENERATING_STORY) && (
          <div className="max-w-3xl mx-auto mt-8 text-center space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-6">
                    What story do you want to tell?
                </h2>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                    Start by entering a topic or plot summary. We'll generate a story draft for you to review before creating the video clips.
                </p>
            </div>
            
            <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden">
                <div className="relative p-2">
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. A cyberpunk detective searching for a lost android in a neon city..."
                        className="w-full bg-slate-900 text-white placeholder-slate-500 rounded-xl p-6 text-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none min-h-[120px]"
                        disabled={isGenerating}
                    />
                    <div className="absolute bottom-6 right-6 text-xs text-slate-600">
                        {topic.length} chars
                    </div>
                </div>
                
                <div className="relative p-2 border-t border-slate-700/50 bg-slate-800/50">
                   <div className="absolute top-3 left-4 text-xs font-semibold text-slate-400 uppercase tracking-wider z-10">Specific Dialogue (Optional)</div>
                   <textarea
                        value={customDialogue}
                        onChange={(e) => setCustomDialogue(e.target.value)}
                        placeholder="Enter specific lines you want the characters to say..."
                        className="w-full bg-slate-900/50 text-white placeholder-slate-500 rounded-xl p-4 pt-8 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none min-h-[100px]"
                        disabled={isGenerating}
                    />
                </div>

                <div className="flex items-center gap-4 bg-slate-800/50 p-4 border-t border-slate-700/50">
                    <label htmlFor="duration-input" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Story Duration (Minutes):</label>
                    <div className="flex items-center gap-2">
                        <input
                            id="duration-input"
                            type="number"
                            min="1"
                            max="60"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-24 bg-slate-900 border border-slate-600 text-white text-lg rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 text-center placeholder-slate-500"
                            placeholder="1"
                            disabled={isGenerating}
                        />
                        <span className="text-sm text-slate-500">min</span>
                    </div>
                </div>

                <div className="bg-slate-800/50 p-4 border-t border-slate-700 flex justify-end">
                    <Button 
                        onClick={handleGenerateDraft} 
                        isLoading={appState === AppState.GENERATING_STORY}
                        disabled={!topic.trim() || duration < 1}
                        className="w-full sm:w-auto px-8 py-3 text-lg"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
                    >
                        Generate Story Draft
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg text-sm flex items-start gap-3 text-left animate-fade-in">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>{error}</span>
                </div>
            )}
          </div>
        )}

        {/* Step 2: Story Review Phase */}
        {(appState === AppState.STORY_REVIEW || appState === AppState.GENERATING_SCENES) && (
           <div className="max-w-3xl mx-auto mt-8 space-y-6 animate-fade-in">
             <div className="text-center mb-8">
                 <h2 className="text-3xl font-bold text-white mb-2">Review Your Story</h2>
                 <p className="text-slate-400">Edit the generated story below to perfection before splitting it into clips.</p>
             </div>

             <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden flex flex-col">
                <div className="bg-slate-900/50 p-3 border-b border-slate-700 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-2">Story Draft Editor</div>
                        <div className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                            ~{duration} Min
                        </div>
                   </div>
                   <Button variant="ghost" onClick={handleBackToInput} disabled={isGenerating} className="text-xs py-1">Back to Inputs</Button>
                </div>
                <textarea
                    value={storyDraft}
                    onChange={(e) => setStoryDraft(e.target.value)}
                    className="w-full h-[400px] bg-slate-900 text-slate-200 p-6 text-base leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none custom-scrollbar"
                    disabled={isGenerating}
                />
                
                {/* Controls Bar */}
                <div className="bg-slate-800 p-5 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                     <label className="flex items-start sm:items-center space-x-3 cursor-pointer group text-left">
                        <div className="relative flex items-center">
                            <input 
                                type="checkbox" 
                                checked={allowVariations} 
                                onChange={(e) => setAllowVariations(e.target.checked)}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-500 bg-slate-700 transition-all checked:border-indigo-500 checked:bg-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                                disabled={isGenerating}
                            />
                            <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none">
                                <path d="M3 7L5.5 9.5L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Allow Appearance Variations</span>
                            <span className="text-xs text-slate-500 hidden sm:block">Allows minor changes (e.g. messy hair, dirt) if needed.</span>
                        </div>
                    </label>

                    <Button 
                        onClick={handleGenerateScenes} 
                        isLoading={appState === AppState.GENERATING_SCENES}
                        disabled={!storyDraft.trim()}
                        className="w-full sm:w-auto px-8 py-3 text-lg"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                    >
                        Generate Clip Prompts
                    </Button>
                </div>
             </div>
             {error && (
                <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg text-sm flex items-start gap-3 text-left animate-fade-in">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>{error}</span>
                </div>
            )}
           </div>
        )}

        {/* Step 3: Results Phase */}
        {appState === AppState.RESULTS && (
            <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Generated Storyboard</h3>
                        <p className="text-slate-400 text-sm">
                            Topic: <span className="text-indigo-400 italic">"{topic}"</span> 
                            <span className="mx-2 text-slate-600">|</span>
                            Mode: <span className={`text-xs font-semibold px-2 py-0.5 rounded ${allowVariations ? 'bg-indigo-900/50 text-indigo-300' : 'bg-green-900/50 text-green-300'}`}>
                                {allowVariations ? 'Dynamic' : 'Strict Consistency'}
                            </span>
                            <span className="mx-2 text-slate-600">|</span>
                            Est. Duration: <span className="text-indigo-300 font-mono">{duration}m ({scenes.length * 10}s)</span>
                        </p>
                    </div>
                    <div className="flex gap-3 mt-4 sm:mt-0">
                        <Button variant="secondary" onClick={handleReset}>New Story</Button>
                        <Button variant="primary" onClick={handleDownloadAll} icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        }>
                            Download All JSON
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {scenes.map((scene, index) => (
                        <SceneCard key={index} scene={scene} />
                    ))}
                </div>

                {/* Footer Tip */}
                <div className="bg-indigo-900/20 border border-indigo-500/20 p-6 rounded-xl text-center">
                    <p className="text-indigo-300 text-sm">
                        <span className="font-bold">Pro Tip:</span> Copy these JSON blocks one by one into your Google Flow Scene Builder's import panel to maintain character consistency across the generated video.
                    </p>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}