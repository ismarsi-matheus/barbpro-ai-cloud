import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export const BRAND = {
  name: "BarbeiroPro",
  color: "#7C3AED",
  site: "https://barbeiropro.app",
};

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "24px" }}>
          <Section style={{ padding: "16px 0" }}>
            <Text style={{ fontSize: 20, fontWeight: 700, color: BRAND.color, margin: 0 }}>
              {BRAND.name}
            </Text>
          </Section>
          <Section
            style={{
              background: "#F9FAFB",
              borderRadius: 12,
              padding: "24px",
              border: "1px solid #E5E7EB",
            }}
          >
            {children}
          </Section>
          <Hr style={{ borderColor: "#E5E7EB", margin: "24px 0" }} />
          <Section>
            <Text style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
              Você recebeu este e-mail do {BRAND.name}.
              {" "}
              <Link href={BRAND.site} style={{ color: BRAND.color }}>
                {BRAND.site}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const btn = {
  background: BRAND.color,
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: 8,
  textDecoration: "none",
  display: "inline-block",
  fontWeight: 600,
};
