import { Badge, Container, Heading, Text } from "../components/atoms";
import { Card } from "../components/molecules";
import { PageShell } from "../components/templates";

export function ExamplePage() {
  return <PageShell title="Neutral design system"><Container><Badge tone="accent">Example</Badge><Heading level={1}>Build a clear foundation.</Heading><Text tone="muted">Composable primitives, documented states, and token-derived styling.</Text><Card description="A complete component example for teams to adapt." title="Reusable card" /></Container></PageShell>;
}
