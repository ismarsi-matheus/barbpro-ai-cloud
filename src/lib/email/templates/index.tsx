import * as React from "react";
import { Heading, Text, Link } from "@react-email/components";
import { EmailLayout, btn, BRAND } from "./layout";

type Base = { nome?: string };

export const templates = {
  "cadastro-confirmacao": (d: Base & { link?: string }) => ({
    subject: `Bem-vindo ao ${BRAND.name}`,
    react: (
      <EmailLayout preview={d.link ? "Confirme seu cadastro" : "Sua conta foi criada"}>
        <Heading>Olá{d.nome ? `, ${d.nome}` : ""}!</Heading>
        <Text>Sua conta foi criada com sucesso.</Text>
        {d.link && (
          <Text>
            <Link href={d.link} style={btn}>Confirmar cadastro</Link>
          </Text>
        )}
      </EmailLayout>
    ),
  }),
  "recuperacao-senha": (d: Base & { link: string }) => ({
    subject: "Recuperação de senha",
    react: (
      <EmailLayout preview="Redefina sua senha">
        <Heading>Redefinir senha</Heading>
        <Text>Clique no botão abaixo para redefinir sua senha.</Text>
        <Text><Link href={d.link} style={btn}>Redefinir senha</Link></Text>
        <Text style={{ fontSize: 12, color: "#6B7280" }}>
          Se você não solicitou, ignore este e-mail.
        </Text>
      </EmailLayout>
    ),
  }),
  "agendamento-confirmacao": (d: Base & { data: string; profissional: string; servico: string }) => ({
    subject: "Agendamento confirmado",
    react: (
      <EmailLayout preview="Seu agendamento foi confirmado">
        <Heading>Agendamento confirmado</Heading>
        <Text>Olá{d.nome ? `, ${d.nome}` : ""}, seu horário foi reservado.</Text>
        <Text><strong>Serviço:</strong> {d.servico}</Text>
        <Text><strong>Profissional:</strong> {d.profissional}</Text>
        <Text><strong>Data:</strong> {d.data}</Text>
      </EmailLayout>
    ),
  }),
  "agendamento-cancelamento": (d: Base & { data: string }) => ({
    subject: "Agendamento cancelado",
    react: (
      <EmailLayout preview="Agendamento cancelado">
        <Heading>Agendamento cancelado</Heading>
        <Text>Olá{d.nome ? `, ${d.nome}` : ""}, seu agendamento de {d.data} foi cancelado.</Text>
      </EmailLayout>
    ),
  }),
  "agendamento-reagendamento": (d: Base & { dataAntiga: string; dataNova: string }) => ({
    subject: "Agendamento reagendado",
    react: (
      <EmailLayout preview="Novo horário do seu agendamento">
        <Heading>Reagendamento</Heading>
        <Text>Olá{d.nome ? `, ${d.nome}` : ""}, seu agendamento foi movido.</Text>
        <Text><strong>De:</strong> {d.dataAntiga}</Text>
        <Text><strong>Para:</strong> {d.dataNova}</Text>
      </EmailLayout>
    ),
  }),
  "agendamento-lembrete": (d: Base & { data: string }) => ({
    subject: "Lembrete de agendamento",
    react: (
      <EmailLayout preview="Lembrete do seu horário">
        <Heading>Lembrete</Heading>
        <Text>Olá{d.nome ? `, ${d.nome}` : ""}, você tem um agendamento em {d.data}.</Text>
      </EmailLayout>
    ),
  }),
  "assinatura-criada": (d: Base & { plano: string }) => ({
    subject: "Assinatura ativada",
    react: (
      <EmailLayout preview="Sua assinatura está ativa">
        <Heading>Assinatura ativa</Heading>
        <Text>Plano contratado: <strong>{d.plano}</strong>.</Text>
      </EmailLayout>
    ),
  }),
  "assinatura-cancelada": (d: Base) => ({
    subject: "Assinatura cancelada",
    react: (
      <EmailLayout preview="Sua assinatura foi cancelada">
        <Heading>Assinatura cancelada</Heading>
        <Text>Olá{d.nome ? `, ${d.nome}` : ""}, sua assinatura foi cancelada. Se foi um engano, fale com nosso suporte.</Text>
      </EmailLayout>
    ),
  }),
  "pagamento-aprovado": (d: Base & { valor: string }) => ({
    subject: "Pagamento aprovado",
    react: (
      <EmailLayout preview="Recebemos seu pagamento">
        <Heading>Pagamento aprovado</Heading>
        <Text>Valor: <strong>{d.valor}</strong>.</Text>
      </EmailLayout>
    ),
  }),
  "pagamento-recusado": (d: Base & { motivo?: string }) => ({
    subject: "Pagamento recusado",
    react: (
      <EmailLayout preview="Não foi possível processar seu pagamento">
        <Heading>Pagamento recusado</Heading>
        <Text>{d.motivo ?? "Verifique os dados do cartão e tente novamente."}</Text>
      </EmailLayout>
    ),
  }),
  "teste": (_d: Base) => ({
    subject: "Teste BarbeiroPro",
    react: (
      <EmailLayout preview="Teste de integração">
        <Heading>Teste BarbeiroPro</Heading>
        <Text>
          Se você recebeu este e-mail, a integração com o Resend está funcionando corretamente.
        </Text>
      </EmailLayout>
    ),
  }),
} as const;

export type TemplateName = keyof typeof templates;
