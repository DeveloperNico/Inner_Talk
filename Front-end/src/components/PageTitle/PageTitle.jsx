import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function PageTitle() {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;

        let title = "Inner Talk";

        switch (true) {
            case path === "/":
                title = "Inner Talk | Home";
            break;
            case path === "/chatbot":
                title = "Inner Talk | Thery";
            break;
            case path === "/login":
                title = "Inner Talk | Entrar";
            break;
            case path === "/checkin":
                title = "Inner Talk | Check-in";
            break;
            case path === "/diario":
                title = "Inner Talk | Diário";
            break;
            case path.startsWith("/resumo"):
                title = "Inner Talk | Resumo";
            break;
            case path.startsWith("/painel"):
                title = "Inner Talk | Painel";
            break;
            default:
                title = "Inner Talk";
        }

        document.title = title;
    }, [location.pathname]);

    return null;
}