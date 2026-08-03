import './theme/themes.css';
import { createApp } from './ui/app';

const root = document.getElementById('app');
if (root) {
  createApp(root);
}
