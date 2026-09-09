import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
class ErrorBoundary extends React.Component<React.PropsWithChildren, { error: string }> {
 state = { error: '' };
 static getDerivedStateFromError(error: unknown) { return { error: error instanceof Error ? error.message : 'The viewer could not start.' }; }
 componentDidCatch(error: Error) { console.error('Viewer error', error); }
 render() { return this.state.error ? <main className="m-8 panel p-8"><h1 className="text-2xl">Viewer unavailable</h1><p>{this.state.error}</p><p>Open this file in an updated browser with WebGL enabled.</p></main> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
