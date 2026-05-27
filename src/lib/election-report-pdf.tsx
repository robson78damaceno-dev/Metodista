import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer
} from "@react-pdf/renderer";
import type { VoteChoice } from "@/lib/vote-choice";
import { voteChoiceLabel } from "@/lib/vote-choice";
import { getMethodistLogoDataUri } from "@/lib/methodist-logo-server";

export type ElectionReportData = {
  election: {
    title: string;
    description: string | null;
    status: "DRAFT" | "OPEN" | "CLOSED";
    opensAt: string | null;
    closesAt: string | null;
  };
  stats: {
    spentBallots: number;
    linksIssued: number;
    linksUsed: number;
  };
  candidates: Array<{
    name: string;
    yesCount: number;
    noCount: number;
    abstainCount: number;
  }>;
  feedbacks: Array<{
    candidate: string;
    choice: VoteChoice;
    feedback: string;
  }>;
};

/** Paleta inspirada na identidade metodista: solenidade, calor e serviço. */
const palette = {
  navy: "#1B2A4A",
  burgundy: "#7A2432",
  burgundyDark: "#5C1824",
  gold: "#C9A45C",
  goldLight: "#E8D4A8",
  cream: "#F8F4EC",
  creamDark: "#EDE6D8",
  ink: "#2C2418",
  muted: "#6B5E52",
  white: "#FFFFFF",
  yes: "#2F6B4F",
  no: "#8F3D3D",
  abstain: "#6B5E52",
  flame: "#EF3E23"
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: palette.ink,
    backgroundColor: palette.cream
  },
  topBand: {
    backgroundColor: palette.navy,
    paddingHorizontal: 44,
    paddingTop: 28,
    paddingBottom: 22
  },
  topBandInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  brandLogoWrap: {
    backgroundColor: palette.white,
    borderRadius: 8,
    padding: 6
  },
  brandLogo: {
    width: 30,
    height: 42,
    objectFit: "contain"
  },
  brandTextWrap: {
    gap: 2
  },
  brandChurch: {
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: palette.goldLight,
    letterSpacing: 0.6
  },
  brandTitle: {
    fontFamily: "Times-Bold",
    fontSize: 16,
    color: palette.white
  },
  brandSubtitle: {
    fontSize: 8,
    color: "#B8C4D9",
    marginTop: 2
  },
  reportBadge: {
    borderWidth: 1,
    borderColor: palette.gold,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  reportBadgeText: {
    fontSize: 8,
    color: palette.goldLight,
    textAlign: "right",
    letterSpacing: 1
  },
  reportBadgeTitle: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    color: palette.white,
    textAlign: "right",
    marginTop: 2
  },
  goldRule: {
    height: 3,
    backgroundColor: palette.gold
  },
  goldRuleThin: {
    height: 1,
    backgroundColor: palette.goldLight,
    marginVertical: 14
  },
  body: {
    paddingHorizontal: 44,
    paddingTop: 24
  },
  heroCard: {
    borderRadius: 14,
    backgroundColor: palette.burgundy,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.burgundyDark
  },
  heroEyebrow: {
    fontSize: 8,
    color: palette.goldLight,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8
  },
  heroTitle: {
    fontFamily: "Times-Bold",
    fontSize: 24,
    color: palette.white,
    lineHeight: 1.25,
    marginBottom: 8
  },
  heroDescription: {
    fontSize: 10,
    color: "#F3E8DC",
    lineHeight: 1.55,
    marginBottom: 14
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  metaChip: {
    backgroundColor: palette.burgundyDark,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: palette.gold
  },
  metaChipText: {
    fontSize: 8,
    color: palette.goldLight
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6
  },
  sectionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.navy,
    alignItems: "center",
    justifyContent: "center"
  },
  sectionIconText: {
    fontFamily: "Times-Bold",
    fontSize: 12,
    color: palette.gold,
    marginTop: -1
  },
  sectionTitle: {
    fontFamily: "Times-Bold",
    fontSize: 15,
    color: palette.navy
  },
  sectionSubtitle: {
    fontSize: 9,
    color: palette.muted,
    marginBottom: 14,
    lineHeight: 1.45
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.creamDark,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderTopWidth: 3,
    borderTopColor: palette.gold
  },
  statLabel: {
    fontSize: 7,
    color: palette.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6
  },
  statValue: {
    fontFamily: "Times-Bold",
    fontSize: 22,
    color: palette.burgundy
  },
  candidateCard: {
    borderRadius: 12,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.creamDark,
    padding: 16,
    marginBottom: 10
  },
  candidateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },
  candidateName: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    color: palette.navy,
    flex: 1,
    paddingRight: 12
  },
  votePills: {
    flexDirection: "row",
    gap: 6
  },
  votePillYes: {
    backgroundColor: "#E8F3ED",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#B8D9C8"
  },
  votePillNo: {
    backgroundColor: "#F9EDED",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E5C4C4"
  },
  votePillAbstain: {
    backgroundColor: "#F1EFEB",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#D8D2C8"
  },
  votePillYesText: {
    fontSize: 8,
    fontWeight: 700,
    color: palette.yes
  },
  votePillNoText: {
    fontSize: 8,
    fontWeight: 700,
    color: palette.no
  },
  votePillAbstainText: {
    fontSize: 8,
    fontWeight: 700,
    color: palette.abstain
  },
  barLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5
  },
  barLegendText: {
    fontSize: 7,
    color: palette.muted
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: palette.creamDark,
    flexDirection: "row",
    overflow: "hidden"
  },
  barYes: {
    backgroundColor: palette.yes,
    height: 10
  },
  barNo: {
    backgroundColor: palette.no,
    height: 10
  },
  barAbstain: {
    backgroundColor: palette.abstain,
    height: 10
  },
  feedbackIntro: {
    borderRadius: 10,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.creamDark,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: palette.gold
  },
  feedbackIntroText: {
    fontSize: 9,
    color: palette.muted,
    lineHeight: 1.5,
    fontStyle: "italic"
  },
  feedbackCard: {
    borderRadius: 12,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.creamDark,
    padding: 14,
    marginBottom: 10
  },
  feedbackQuoteMark: {
    fontFamily: "Times-Bold",
    fontSize: 28,
    color: palette.goldLight,
    lineHeight: 1,
    marginBottom: 4
  },
  feedbackMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.creamDark
  },
  feedbackCandidate: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    color: palette.navy
  },
  feedbackVoteBadge: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10
  },
  feedbackVoteText: {
    fontSize: 8,
    fontWeight: 700
  },
  feedbackText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: palette.ink
  },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.creamDark,
    borderStyle: "dashed",
    padding: 24,
    backgroundColor: palette.white,
    alignItems: "center"
  },
  emptyText: {
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: palette.muted,
    textAlign: "center"
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.navy,
    paddingHorizontal: 44,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  footerText: {
    fontSize: 8,
    color: "#B8C4D9"
  },
  footerAccent: {
    fontSize: 8,
    color: palette.gold
  },
  pageNumber: {
    fontFamily: "Times-Roman",
    fontSize: 9,
    color: palette.goldLight
  }
});

function PageHeader({ logoSrc }: { logoSrc: string }) {
  return (
    <>
      <View style={styles.topBand}>
        <View style={styles.topBandInner}>
          <View style={styles.brandBlock}>
            <View style={styles.brandLogoWrap}>
              <Image src={logoSrc} style={styles.brandLogo} />
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandChurch}>Igreja Metodista</Text>
              <Text style={styles.brandTitle}>Concílio</Text>
              <Text style={styles.brandSubtitle}>Votação anônima · Serviço e discernimento comunitário</Text>
            </View>
          </View>
          <View style={styles.reportBadge}>
            <Text style={styles.reportBadgeText}>RELATÓRIO OFICIAL</Text>
            <Text style={styles.reportBadgeTitle}>Apuração pastoral</Text>
          </View>
        </View>
      </View>
      <View style={styles.goldRule} />
    </>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Text style={styles.sectionIconText}>†</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </>
  );
}

function PageFooter({ left, page }: { left: string; page: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{left}</Text>
      <Text style={styles.footerAccent}>Coração aquecido · Mente aberta · Portas abertas</Text>
      <Text style={styles.pageNumber}>{page}</Text>
    </View>
  );
}

function statusLabel(status: ElectionReportData["election"]["status"]) {
  if (status === "OPEN") return "Aberta";
  if (status === "CLOSED") return "Encerrada";
  return "Rascunho";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function CandidateResultRow({
  name,
  yesCount,
  noCount,
  abstainCount
}: {
  name: string;
  yesCount: number;
  noCount: number;
  abstainCount: number;
}) {
  const total = yesCount + noCount + abstainCount;
  const yesWidth = total > 0 ? `${(yesCount / total) * 100}%` : "0%";
  const noWidth = total > 0 ? `${(noCount / total) * 100}%` : "0%";
  const abstainWidth = total > 0 ? `${(abstainCount / total) * 100}%` : "0%";

  return (
    <View style={styles.candidateCard}>
      <View style={styles.candidateHeader}>
        <Text style={styles.candidateName}>{name}</Text>
        <View style={styles.votePills}>
          <View style={styles.votePillYes}>
            <Text style={styles.votePillYesText}>Sim {yesCount}</Text>
          </View>
          <View style={styles.votePillNo}>
            <Text style={styles.votePillNoText}>Não {noCount}</Text>
          </View>
          <View style={styles.votePillAbstain}>
            <Text style={styles.votePillAbstainText}>Abster {abstainCount}</Text>
          </View>
        </View>
      </View>
      <View style={styles.barLegend}>
        <Text style={styles.barLegendText}>Distribuição dos votos</Text>
        <Text style={styles.barLegendText}>{total} registro(s)</Text>
      </View>
      <View style={styles.barTrack}>
        {total > 0 ? <View style={[styles.barYes, { width: yesWidth }]} /> : null}
        {total > 0 ? <View style={[styles.barNo, { width: noWidth }]} /> : null}
        {total > 0 ? <View style={[styles.barAbstain, { width: abstainWidth }]} /> : null}
      </View>
    </View>
  );
}

function ElectionReportDocument({ data, logoSrc }: { data: ElectionReportData; logoSrc: string }) {
  const generatedAt = new Date().toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short"
  });

  return (
    <Document title={`Relatório - ${data.election.title}`} author="Concílio Metodista">
      <Page size="A4" style={styles.page}>
        <PageHeader logoSrc={logoSrc} />

        <View style={styles.body}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Motivo da votação</Text>
            <Text style={styles.heroTitle}>{data.election.title}</Text>
            {data.election.description ? (
              <Text style={styles.heroDescription}>{data.election.description}</Text>
            ) : null}
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>Status: {statusLabel(data.election.status)}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>Abertura: {formatDate(data.election.opensAt)}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>Encerramento: {formatDate(data.election.closesAt)}</Text>
              </View>
            </View>
          </View>

          <SectionHeading
            title="Resumo da participação"
            subtitle="Números agregados da comunidade, preservando o anonimato de cada eleitor."
          />
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Cédulas apuradas</Text>
              <Text style={styles.statValue}>{data.stats.spentBallots}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Links enviados</Text>
              <Text style={styles.statValue}>{data.stats.linksIssued}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Participantes</Text>
              <Text style={styles.statValue}>{data.stats.linksUsed}</Text>
            </View>
          </View>

          <View style={styles.goldRuleThin} />

          <SectionHeading
            title="Apuração por candidato"
            subtitle="Resultado Sim, Não e Abster de cada nome apresentado na cédula de votação."
          />
          {data.candidates.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum candidato cadastrado nesta eleição.</Text>
            </View>
          ) : (
            data.candidates.map((candidate) => (
              <CandidateResultRow
                key={candidate.name}
                name={candidate.name}
                yesCount={candidate.yesCount}
                noCount={candidate.noCount}
                abstainCount={candidate.abstainCount}
              />
            ))
          )}
        </View>

        <PageFooter left={`Gerado em ${generatedAt}`} page="1" />
      </Page>

      <Page size="A4" style={styles.page}>
        <PageHeader logoSrc={logoSrc} />

        <View style={styles.body}>
          <SectionHeading
            title="Palavras da comunidade"
            subtitle="Feedbacks anônimos compartilhados pelos irmãos e irmãs durante a votação."
          />

          <View style={styles.feedbackIntro}>
            <Text style={styles.feedbackIntroText}>
              “Cada observação abaixo foi oferecida de forma voluntária e confidencial, sem identificação do eleitor,
              como expressão de cuidado e discernimento conjunto.”
            </Text>
          </View>

          {data.feedbacks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum feedback foi registrado nesta eleição.</Text>
            </View>
          ) : (
            data.feedbacks.map((entry, index) => {
              const voteColor =
                entry.choice === "YES" ? palette.yes : entry.choice === "NO" ? palette.no : palette.abstain;
              const voteBackground =
                entry.choice === "YES" ? "#E8F3ED" : entry.choice === "NO" ? "#F9EDED" : "#F1EFEB";
              return (
                <View key={`${entry.candidate}-${index}`} style={styles.feedbackCard} wrap={false}>
                  <Text style={styles.feedbackQuoteMark}>“</Text>
                  <View style={styles.feedbackMeta}>
                    <Text style={styles.feedbackCandidate}>{entry.candidate}</Text>
                    <View style={[styles.feedbackVoteBadge, { backgroundColor: voteBackground }]}>
                      <Text style={[styles.feedbackVoteText, { color: voteColor }]}>
                        Voto: {voteChoiceLabel(entry.choice)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.feedbackText}>{entry.feedback}</Text>
                </View>
              );
            })
          )}
        </View>

        <PageFooter left="Feedbacks sem identificação pessoal" page="2" />
      </Page>
    </Document>
  );
}

export async function buildElectionReportPdf(data: ElectionReportData) {
  const logoSrc = getMethodistLogoDataUri();
  return renderToBuffer(<ElectionReportDocument data={data} logoSrc={logoSrc} />);
}

export function electionReportFilename(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `relatorio-metodista-${slug || "eleicao"}.pdf`;
}
