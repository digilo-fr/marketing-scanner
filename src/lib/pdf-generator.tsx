import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type {
  Audit,
  CategoryScores,
  Recommendation,
  Category,
} from "@/types";
import { CATEGORY_LABELS_FR, CATEGORY_WEIGHTS } from "@/types";

const COLOR = {
  primary: "#7c3aed",
  primaryLight: "#faf5ff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  white: "#ffffff",
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 48,
    fontSize: 10,
    color: COLOR.text,
    fontFamily: "Helvetica",
  },
  coverPage: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
  },
  coverHeader: {
    backgroundColor: COLOR.primary,
    paddingVertical: 60,
    paddingHorizontal: 48,
    color: COLOR.white,
  },
  coverEyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    opacity: 0.85,
  },
  coverTitle: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
  },
  coverBody: {
    paddingHorizontal: 48,
    paddingVertical: 48,
  },
  coverBusiness: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  coverUrl: {
    fontSize: 11,
    color: COLOR.primary,
    marginBottom: 32,
  },
  scoreBox: {
    backgroundColor: COLOR.primaryLight,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    marginVertical: 24,
  },
  scoreLabel: {
    fontSize: 10,
    color: COLOR.primary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontFamily: "Helvetica-Bold",
    color: COLOR.text,
  },
  scoreOver: {
    fontSize: 22,
    color: COLOR.muted,
  },
  gradeBadge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: COLOR.primary,
    color: COLOR.white,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  coverDate: {
    fontSize: 11,
    color: COLOR.muted,
    textAlign: "center",
    marginTop: 8,
  },
  coverFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.text,
    color: COLOR.white,
    paddingVertical: 16,
    paddingHorizontal: 48,
    fontSize: 10,
    textAlign: "center",
  },
  h1: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: COLOR.text,
  },
  h2: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 10,
    color: COLOR.text,
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.5,
    color: COLOR.text,
    marginBottom: 8,
  },
  muted: {
    fontSize: 10,
    color: COLOR.muted,
  },
  scoreRow: {
    marginBottom: 14,
  },
  scoreRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  scoreRowLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLOR.text,
  },
  scoreRowValue: {
    fontSize: 11,
    color: COLOR.muted,
  },
  barTrack: {
    height: 8,
    backgroundColor: COLOR.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    backgroundColor: COLOR.primary,
    borderRadius: 4,
  },
  recoCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLOR.primary,
    backgroundColor: COLOR.bg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderRadius: 4,
  },
  recoTitle: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    color: COLOR.text,
    marginBottom: 4,
  },
  recoDesc: {
    fontSize: 10,
    color: COLOR.text,
    lineHeight: 1.45,
    marginBottom: 6,
  },
  recoMeta: {
    fontSize: 9,
    color: COLOR.muted,
  },
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: COLOR.muted,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: COLOR.border,
    paddingTop: 8,
  },
});

function PageFooter({ date }: { date: string }) {
  return (
    <Text style={styles.pageFooter} fixed>
      Marketing Scanner — Digilo · audit.digilo.fr · {date}
    </Text>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreRowHeader}>
        <Text style={styles.scoreRowLabel}>{label}</Text>
        <Text style={styles.scoreRowValue}>{clamped}/100</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
}

function RecoCard({
  index,
  reco,
}: {
  index: number;
  reco: Recommendation;
}) {
  return (
    <View style={styles.recoCard} wrap={false}>
      <Text style={styles.recoTitle}>
        {index}. {reco.title}
      </Text>
      <Text style={styles.recoDesc}>{reco.description}</Text>
      <Text style={styles.recoMeta}>
        Impact : {reco.impact_estimate_min}–{reco.impact_estimate_max} €/mois
        {"   "}·{"   "}Délai : {reco.timeline}
        {"   "}·{"   "}Confiance : {reco.confidence}
      </Text>
    </View>
  );
}

interface AuditPdfProps {
  audit: Audit;
  recommendations: Recommendation[];
  scores: CategoryScores;
  businessName: string;
}

function AuditPdfDoc({
  audit,
  recommendations,
  scores,
  businessName,
}: AuditPdfProps) {
  const date = new Date().toISOString().slice(0, 10);

  const sortedByImpact = [...recommendations].sort(
    (a, b) => b.impact_estimate_max - a.impact_estimate_max
  );
  const quickWins = sortedByImpact.filter((r) => r.priority === "quick_win").slice(0, 5);
  const strategic = sortedByImpact.filter((r) => r.priority === "strategic").slice(0, 5);

  return (
    <Document title={`Audit Marketing — ${businessName}`} author="Digilo">
      {/* COVER */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHeader}>
          <Text style={styles.coverEyebrow}>Marketing Scanner — Digilo</Text>
          <Text style={styles.coverTitle}>Marketing Audit</Text>
        </View>
        <View style={styles.coverBody}>
          <Text style={styles.coverBusiness}>{businessName}</Text>
          <Text style={styles.coverUrl}>{audit.target_url}</Text>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Score global</Text>
            <Text style={styles.scoreValue}>
              {audit.overall_score}
              <Text style={styles.scoreOver}> /100</Text>
            </Text>
            <Text style={styles.gradeBadge}>Grade {audit.grade}</Text>
          </View>

          <Text style={styles.coverDate}>Émis le {date}</Text>
        </View>
        <Text style={styles.coverFooter}>
          audit.digilo.fr — Marketing Scanner
        </Text>
      </Page>

      {/* SCORES */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Détail des scores</Text>
        <Text style={styles.muted}>
          Évaluation par catégorie, pondérée selon son poids dans le score
          global.
        </Text>
        <View style={{ marginTop: 18 }}>
          {(Object.keys(CATEGORY_LABELS_FR) as Category[]).map((cat) => (
            <ScoreBar
              key={cat}
              label={`${CATEGORY_LABELS_FR[cat]} (poids ${(CATEGORY_WEIGHTS[cat] * 100).toFixed(0)}%)`}
              value={scores[cat] ?? 0}
            />
          ))}
        </View>
        <View style={{ marginTop: 18, padding: 14, backgroundColor: COLOR.primaryLight, borderRadius: 8 }}>
          <Text style={[styles.scoreRowLabel, { color: COLOR.primary }]}>
            Total pondéré : {audit.overall_score}/100 — Grade {audit.grade}
          </Text>
        </View>
        <PageFooter date={date} />
      </Page>

      {/* QUICK WINS */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Top quick wins</Text>
        <Text style={styles.muted}>
          Actions à fort impact, livrables sous quelques jours.
        </Text>
        <View style={{ marginTop: 16 }}>
          {quickWins.length === 0 ? (
            <Text style={styles.paragraph}>Aucun quick win identifié.</Text>
          ) : (
            quickWins.map((r, i) => <RecoCard key={r.id} index={i + 1} reco={r} />)
          )}
        </View>
        <PageFooter date={date} />
      </Page>

      {/* STRATEGIC */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Recommandations stratégiques</Text>
        <Text style={styles.muted}>
          Chantiers structurants à fort retour sur 1–3 mois.
        </Text>
        <View style={{ marginTop: 16 }}>
          {strategic.length === 0 ? (
            <Text style={styles.paragraph}>Aucune reco stratégique identifiée.</Text>
          ) : (
            strategic.map((r, i) => <RecoCard key={r.id} index={i + 1} reco={r} />)
          )}
        </View>
        <PageFooter date={date} />
      </Page>

      {/* METHODOLOGY */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Méthodologie</Text>
        <Text style={styles.paragraph}>
          Cet audit évalue 6 dimensions clés de la performance marketing d'un
          site : Content & Messaging (25%), Conversion (20%), SEO (20%),
          Positionnement concurrentiel (15%), Brand & Trust (10%) et Growth
          (10%). Chaque catégorie est notée de 0 à 100 par un agent IA
          spécialisé, puis le score global est pondéré selon les poids ci-dessus.
        </Text>
        <Text style={styles.h2}>Stack LLM</Text>
        <Text style={styles.paragraph}>
          Le pipeline orchestre plusieurs LLMs ouverts via un router maison :
          Groq (Llama 3.3 70B), Cerebras et SambaNova. Le contenu du site est
          extrait via un scraper headless, puis chaque agent reçoit le contexte
          sous forme structurée. Un synthétiseur final consolide les
          recommandations en quick wins et chantiers stratégiques.
        </Text>
        <Text style={styles.h2}>Limites</Text>
        <Text style={styles.paragraph}>
          L'audit est basé sur les pages publiquement accessibles au moment du
          scan. Il ne remplace pas un audit analytics approfondi (GA4, Search
          Console, données CRM). Les estimations d'impact sont indicatives et
          dépendent du trafic et de la maturité existante.
        </Text>
        <PageFooter date={date} />
      </Page>
    </Document>
  );
}

/**
 * Render the audit PDF and return it as a Node Buffer.
 */
export async function renderAuditPdf(
  audit: Audit,
  recommendations: Recommendation[],
  scores: CategoryScores,
  businessName: string
): Promise<Buffer> {
  const instance = pdf(
    <AuditPdfDoc
      audit={audit}
      recommendations={recommendations}
      scores={scores}
      businessName={businessName}
    />
  );
  // @react-pdf/renderer v4: toBuffer() returns a Node Readable in Node env,
  // but also exposes toBlob(). We collect the stream into a Buffer.
  const result = await instance.toBuffer();
  if (Buffer.isBuffer(result)) return result;

  // Fallback: stream → Buffer
  const stream = result as unknown as NodeJS.ReadableStream;
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer | string) =>
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    );
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
