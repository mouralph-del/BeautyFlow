import { Component, Suspense } from "react";
import "./RouteLoadingBoundary.css";
import { SkeletonList } from "../Skeleton";

class ChunkErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <main className="route-load-state"><section><h1>Não foi possível carregar esta página.</h1><p>Verifique sua conexão e tente novamente.</p><div className="route-load-state__actions"><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button><a href="/">Voltar ao início</a></div></section></main>;
    return this.props.children;
  }
}

export default function RouteLoadingBoundary({ children }) {
  return <ChunkErrorBoundary>
    <Suspense fallback={<main className="route-load-state" aria-busy="true"><section style={{padding:16}}><SkeletonList count={4} /></section></main>}>
      {children}
    </Suspense>
  </ChunkErrorBoundary>;
}
