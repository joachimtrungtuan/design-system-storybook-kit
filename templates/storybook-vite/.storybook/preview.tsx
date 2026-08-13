import tokens from "../tokens.json";
import { preview } from "story-cli-kit/preview";
import "../src/styles/globals.css";

export default { ...preview(tokens) };
