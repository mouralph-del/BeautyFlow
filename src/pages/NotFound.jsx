import { Home, LogIn, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import Layout from "../layouts/Layout";
import "./NotFound.css";
export default function NotFound(){const{user}=useAuth();return <Layout><main className="not-found-page"><section><span>404</span><h1>Ops! Não encontramos essa página.</h1><p>A página pode ter sido movida ou não existir.</p><div><Link to="/"><Home/>Voltar ao início</Link>{user?<Link className="secondary" to={user.app_metadata?.role==="admin"?"/admin":"/minha-conta"}><UserRound/>Voltar ao Meu Espaço</Link>:<Link className="secondary" to="/entrar"><LogIn/>Entrar na minha conta</Link>}</div></section></main></Layout>}
