export type Option = 'buried' | 'channel';
export type View = 'network' | 'section' | 'tapping' | 'weather';
export type Weather = 'dry' | 'rain' | 'sand';
export interface PointLabel { name: string; point: number[]; }
export interface NetworkPath { id: string; name: string; kind: string; points: number[][]; length: number; od: number; }
export interface Asset extends PointLabel { kind: string; }
export interface ModelSettings { option: Option; view: View; opened: boolean; weather: Weather; step: number; showBase: boolean; showAssets: boolean; selectedPath: string; animation: 'off' | 'playing' | 'paused'; flow: boolean; flowPaused: boolean; }
export interface CameraAction { kind: 'home' | 'top' | 'left' | 'right' | 'in' | 'out'; serial: number; }
export interface Caption { title: string; body: string; }
