import { useEffect } from "react";

export function PageTitle() {
    useEffect(() => {
        const path = window.location.pathname;

        let title = "Inner Talk";

        switch (path) {
            case "/":
                title = "Inner Talk | Home";
            break;
            default:
                title = "Inner Talk";
        }

        document.title = title;
    }, []);

    return null;
}