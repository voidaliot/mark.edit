import { renderRoutes } from './routes';
import { ThemeProvider } from './theme';

export default function App() {
  return <ThemeProvider>{renderRoutes()}</ThemeProvider>;
}
