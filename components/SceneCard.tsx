import React, { useState } from 'react';
import { Scene } from '../types';
import { Button } from './Button';

interface SceneCardProps {
  scene: Scene;
}

export const SceneCard: React.FC<SceneCardProps> = ({ scene }) => {
  const [copied, setCopied] = useState(false);

  // Format the JSON specifically for the "Google Flow" prompt requirement
  // We include all fields to ensure the downstream tool has everything.
  const jsonPrompt = JSON.stringify(scene, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-indigo-500/50 transition-all duration-300 flex flex-col h-full group">
      {/* Header */}
      <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 font-bold text-sm">
            {scene.scene_number}
          </span>
          <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">
            {scene.duration_seconds} Seconds
          </span>
        </div>
        <div className="text-xs font-semibold px-2 py-1 rounded bg-slate-700 text-slate-300 border border-slate-600">
            {scene.camera_angle}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-grow space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Visual Action</h4>
          <p className="text-slate-200 text-sm leading-relaxed">{scene.action_description}</p>
        </div>
        
        {scene.dialogue && (
           <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-1">Dialogue</h4>
            <p className="text-slate-200 text-sm italic">"{scene.dialogue}"</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
             <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Setting</h4>
                <p className="text-xs text-slate-400 line-clamp-2" title={scene.setting_description}>{scene.setting_description}</p>
            </div>
             <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Mood</h4>
                <p className="text-xs text-slate-400">{scene.mood}</p>
            </div>
        </div>
      </div>

      {/* Code Block & Action */}
      <div className="bg-black/30 p-4 border-t border-slate-700 mt-auto">
        <div className="relative mb-3">
             <pre className="text-[10px] leading-4 font-mono text-slate-400 bg-black/50 p-2 rounded border border-slate-800 h-24 overflow-y-auto custom-scrollbar">
                {jsonPrompt}
            </pre>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
        </div>
       
        <Button 
            onClick={handleCopy} 
            variant={copied ? "secondary" : "primary"}
            className="w-full text-sm"
            icon={copied ? 
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> 
                : 
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
            }
        >
          {copied ? 'Copied Prompt' : 'Copy JSON for Flow Builder'}
        </Button>
      </div>
    </div>
  );
};