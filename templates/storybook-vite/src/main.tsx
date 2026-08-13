import { createRoot } from "react-dom/client";

import { ExamplePage } from "./pages/ExamplePage";
import "./styles/globals.css";

const root = document.getElementById("root");
if (root === null) throw new Error("Missing application root.");
createRoot(root).render(<ExamplePage />);
