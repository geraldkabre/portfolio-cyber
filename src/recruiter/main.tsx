import { createRoot } from 'react-dom/client';
import { Recruiter } from './Recruiter';
import './recruiter.css';

// Recruiter Mode: plain DOM, no Three.js, no audio. Shares content (src/content) and tokens with the 3D campus.
createRoot(document.getElementById('root')!).render(<Recruiter />);
