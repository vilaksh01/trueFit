import { h, render } from 'preact';
import App from './components/App';
import './styles.css';

// Wait for DOM to be ready
const mount = () => {
  const root = document.getElementById('app');
  if (!root) {
    console.error('Root element not found');
    return;
  }

  render(<App />, root);
};

// Check if the DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}