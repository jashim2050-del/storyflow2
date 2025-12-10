export interface Scene {
  scene_number: number;
  duration_seconds: number;
  setting_description: string;
  character_appearance: string;
  action_description: string;
  dialogue: string;
  camera_angle: string;
  lighting: string;
  mood: string;
}

export interface User {
  email: string;
  name: string;
  avatar: string;
}

export interface UserStats extends User {
  id: string;
  storiesGenerated: number;
  totalScenesGenerated: number;
  lastActive: string;
  role: 'user' | 'admin';
}

export enum AppState {
  LOGIN = 'LOGIN',
  INPUT = 'INPUT',
  GENERATING_STORY = 'GENERATING_STORY',
  STORY_REVIEW = 'STORY_REVIEW',
  GENERATING_SCENES = 'GENERATING_SCENES',
  RESULTS = 'RESULTS',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
}