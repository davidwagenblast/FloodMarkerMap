import { useEffect, useState } from 'preact/hooks';
import Header from './components/Header';
import MapView from './components/MapView';
import About from './pages/About';
import Contribute from './pages/Contribute';

// Hash routes (#/, #/about, #/contribute) so any static host works without a router
const PAGES = { map: MapView, about: About, contribute: Contribute };

function pageFromHash() {
  const name = location.hash.replace(/^#\/?/, '');
  return PAGES[name] ? name : 'map';
}

export default function App() {
  const [page, setPage] = useState(pageFromHash);

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    addEventListener('hashchange', onHashChange);
    return () => removeEventListener('hashchange', onHashChange);
  }, []);

  const Page = PAGES[page];
  return (
    <>
      <Header page={page} />
      <main class="main">
        <Page />
      </main>
    </>
  );
}
