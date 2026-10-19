import HIGHLIGHT_MEDIA from "./highlight-media.json" with { type: "json" };

export type HighlightParticipantId =
  | "alice"
  | "isinha"
  | "kurtz"
  | "musashi"
  | "tapioca"
  | "zakkaryz";

export interface EventHighlight {
  id: string;
  title: string;
  description: string;
  participantIds: readonly HighlightParticipantId[];
  category: "funny" | "mixed" | "skill";
  durationSeconds: number;
  sizeBytes: number;
  videoUrl: string;
  posterUrl: string;
  downloadFilename: string;
  downloadUrl?: string;
}

export const HIGHLIGHT_PARTICIPANTS: readonly {
  id: HighlightParticipantId;
  name: string;
  avatarUrl: string;
}[] = [
  { id: "alice", name: "Alice", avatarUrl: "/avatars/alice.png" },
  { id: "isinha", name: "isinha", avatarUrl: "/avatars/isinha.png" },
  { id: "kurtz", name: "Kurtz", avatarUrl: "/avatars/kurtz.png" },
  { id: "musashi", name: "Musashi", avatarUrl: "/avatars/musashi.png" },
  { id: "tapioca", name: "Tapioca", avatarUrl: "/avatars/tapioca.png" },
  { id: "zakkaryz", name: "Zakkaryz", avatarUrl: "/avatars/zakkaryz.png" },
];

type HighlightDetails = Omit<
  EventHighlight,
  "sizeBytes" | "videoUrl" | "posterUrl" | "downloadFilename" | "downloadUrl"
>;

const HIGHLIGHTS_BASE_URL =
  "https://waltmlgtzogbqhxptqqn.supabase.co/storage/v1/object/public/event-highlights/";

function clip(details: HighlightDetails): EventHighlight {
  const media = HIGHLIGHT_MEDIA[details.id as keyof typeof HIGHLIGHT_MEDIA];
  const videoUrl = `${HIGHLIGHTS_BASE_URL}${media.videoFile}`;
  const downloadFilename = `super-skin-challenge-${details.id}.mp4`;
  return {
    ...details,
    durationSeconds: media.durationSeconds,
    sizeBytes: media.sizeBytes,
    videoUrl,
    posterUrl: `${HIGHLIGHTS_BASE_URL}${media.posterFile}`,
    downloadFilename,
    downloadUrl: `${videoUrl}?download=${encodeURIComponent(downloadFilename)}`,
  };
}

/** Participant tags identify the subject of a moment, rather than every voice in the call. */
export const EVENT_HIGHLIGHTS: readonly EventHighlight[] = [
  clip({
    id: "h1-provocation",
    title: "A provocação já começou",
    description: "O pedido era jogar com vontade. A resposta veio na mesma hora.",
    participantIds: [],
    category: "funny",
    durationSeconds: 14,
  }),
  clip({
    id: "h1-knife",
    title: "Alice resolve na faca",
    description: "isinha parte para cima, mas Alice leva a melhor no duelo de faca.",
    participantIds: ["alice", "isinha"],
    category: "funny",
    durationSeconds: 13.2,
  }),
  clip({
    id: "h1-rat",
    title: "Rato de duelo",
    description: "A turma questiona o treino de Musashi. Ele tem uma resposta na ponta da língua.",
    participantIds: ["musashi"],
    category: "funny",
    durationSeconds: 17,
  }),
  clip({
    id: "h1-sheriff-aura",
    title: "Headshot e aura",
    description: "Musashi acerta de Sheriff e ainda rende assunto na call.",
    participantIds: ["musashi"],
    category: "mixed",
    durationSeconds: 11,
  }),
  clip({
    id: "h1-clean-vandal",
    title: "Um tiro na saída",
    description: "Musashi espera Kurtz abrir a caixa e fecha o round com um headshot.",
    participantIds: ["musashi"],
    category: "skill",
    durationSeconds: 10,
  }),
  clip({
    id: "h1-what-a-flick",
    title: "A reação foi: flick!",
    description: "Kurtz vence a troca, vista pela câmera de Musashi, e a turma vai junto.",
    participantIds: ["kurtz"],
    category: "mixed",
    durationSeconds: 10.5,
  }),
  clip({
    id: "h1-roast",
    title: "Perdi para ele…",
    description: "A tentativa de explicar a derrota só abre espaço para outra provocação.",
    participantIds: [],
    category: "funny",
    durationSeconds: 14.5,
  }),
  clip({
    id: "h1-grass",
    title: "Foi tocar grama",
    description: "Até a conversa sobre sair de casa vira resenha no meio do evento.",
    participantIds: [],
    category: "funny",
    durationSeconds: 18.5,
  }),
  clip({
    id: "h1-headset",
    title: "Vale trocar por um headset?",
    description: "Surge uma proposta de trocar o prêmio. O argumento: custa o mesmo preço.",
    participantIds: [],
    category: "funny",
    durationSeconds: 16.2,
  }),
  clip({
    id: "h1-mind-headshot",
    title: "Kurtz entrou na mente",
    description: "A provocação vem primeiro. Depois, Kurtz encaixa o headshot em isinha.",
    participantIds: ["kurtz", "isinha"],
    category: "mixed",
    durationSeconds: 20,
  }),
  clip({
    id: "h1-sheriff-equip",
    title: "Puxou, acertou",
    description: "Musashi saca a Sheriff e acerta Alice assim que ela abre o ângulo.",
    participantIds: ["musashi"],
    category: "skill",
    durationSeconds: 10.5,
  }),
  clip({
    id: "h2-knife-decider",
    title: "9 a 9? Vai de faca",
    description: "Musashi e isinha se cercam até a facada que decide o mapa.",
    participantIds: ["musashi", "isinha"],
    category: "mixed",
    durationSeconds: 13.5,
  }),
  clip({
    id: "h2-culposa",
    title: "Vitória culposa",
    description: "A troca de Alice e Kurtz termina com um veredito bem particular da call.",
    participantIds: ["alice", "kurtz"],
    category: "funny",
    durationSeconds: 15,
  }),
  clip({
    id: "h2-alice-flick",
    title: "Amassa, Alice!",
    description: "Alice abre a linha, acerta o headshot e recebe o incentivo da torcida.",
    participantIds: ["alice"],
    category: "mixed",
    durationSeconds: 12,
  }),
  clip({
    id: "h2-brutal",
    title: "Foi brutal",
    description: "Alice vence a troca na rampa e a reação da call acompanha o abate.",
    participantIds: ["alice"],
    category: "mixed",
    durationSeconds: 12,
  }),
  clip({
    id: "h2-maquina",
    title: "Alice é uma máquina",
    description: "Mais uma abertura, mais um headshot de Alice e mais barulho na call.",
    participantIds: ["alice"],
    category: "mixed",
    durationSeconds: 10.5,
  }),
  clip({
    id: "h2-interview-wording",
    title: "A pausa no elogio",
    description: "Na entrevista de Musashi sobre isinha, uma pausa muda tudo para a turma.",
    participantIds: ["musashi", "isinha"],
    category: "funny",
    durationSeconds: 12.1,
  }),
  clip({
    id: "h2-6x9",
    title: "Resenha com o placar",
    description: "Musashi e isinha estão em jogo. A turma encontra outra coisa no placar.",
    participantIds: ["musashi", "isinha"],
    category: "funny",
    durationSeconds: 14.2,
  }),
  clip({
    id: "h2-draw-weapon",
    title: "Nem deu tempo de sacar",
    description: "Musashi tenta trocar a faca pela Vandal, mas isinha chega antes do disparo.",
    participantIds: ["musashi", "isinha"],
    category: "mixed",
    durationSeconds: 14,
  }),
  clip({
    id: "hour3-01",
    title: "A resenha do drone",
    description: "Musashi fecha a troca e o papo da call muda para o drone.",
    participantIds: ["musashi"],
    category: "mixed",
    durationSeconds: 12,
  }),
  clip({
    id: "hour3-02",
    title: "25 de vida e uma faca",
    description: "No 9 a 9, isinha sobrevive com 25 de vida e decide o mapa contra Musashi.",
    participantIds: ["isinha", "musashi"],
    category: "mixed",
    durationSeconds: 13,
  }),
  clip({
    id: "hour3-03",
    title: "isinha abriu, acertou",
    description: "isinha sai da cobertura e resolve a troca com um headshot.",
    participantIds: ["isinha"],
    category: "mixed",
    durationSeconds: 11,
  }),
  clip({
    id: "hour3-04",
    title: "Melhor ir deitar",
    description: "Musashi perde a troca e a conversa sobre ficar na base continua na call.",
    participantIds: ["musashi"],
    category: "funny",
    durationSeconds: 17,
  }),
  clip({
    id: "hour3-05",
    title: "Um tiro para o match point",
    description: "isinha segura a saída da caixa e chega ao 9 a 8 com um headshot.",
    participantIds: ["isinha"],
    category: "skill",
    durationSeconds: 10,
  }),
  clip({
    id: "hour3-06",
    title: "Não acabou ainda",
    description: "Musashi acerta isinha nas caixas e salva o match point para forçar o 9 a 9.",
    participantIds: ["musashi"],
    category: "skill",
    durationSeconds: 12,
  }),
  clip({
    id: "hour3-07",
    title: "O troco na faca",
    description: "Musashi vence mais um desempate de faca contra isinha. A reação vem junto.",
    participantIds: ["musashi", "isinha"],
    category: "mixed",
    durationSeconds: 17,
  }),
  clip({
    id: "hour3-08",
    title: "Gelado no duelo",
    description: "Musashi encaixa o headshot e ganha um comentário sobre o nervosismo.",
    participantIds: ["musashi"],
    category: "mixed",
    durationSeconds: 12,
  }),
  clip({
    id: "hour3-09",
    title: "Sai da base!",
    description: "Depois do headshot de Musashi, a cobrança e a resposta chegam sem intervalo.",
    participantIds: ["musashi", "isinha"],
    category: "mixed",
    durationSeconds: 14,
  }),
  clip({
    id: "hour3-10",
    title: "16 de vida. Ainda dá.",
    description: "Musashi esvazia a Sheriff, recarrega e volta para acertar o headshot com 16 de vida.",
    participantIds: ["musashi"],
    category: "mixed",
    durationSeconds: 15,
  }),
  clip({
    id: "hour3-11",
    title: "Foi só falar…",
    description: "O papo era sobre acertar o corpo. A troca seguinte parece responder à conversa.",
    participantIds: ["musashi", "isinha"],
    category: "mixed",
    durationSeconds: 19,
  }),
  clip({
    id: "hour3-12",
    title: "Nossa Senhora Aparecida!",
    description: "O headshot de Musashi junto à caixa rende uma reação à altura na call.",
    participantIds: ["musashi"],
    category: "mixed",
    durationSeconds: 12,
  }),
  clip({
    id: "hour3-13",
    title: "A bala do título",
    description: "Musashi acerta a última eliminação da grande final e começa a comemoração.",
    participantIds: ["musashi"],
    category: "mixed",
    durationSeconds: 13,
  }),
  clip({
    id: "hour3-14",
    title: "Sheriff na abertura",
    description: "Zakkaryz muda de posição e fecha o round com um headshot de Sheriff.",
    participantIds: ["zakkaryz"],
    category: "skill",
    durationSeconds: 11,
  }),
  clip({
    id: "hour3-15",
    title: "A faca decidiu",
    description: "Zakkaryz e Tapioca disputam o 9 a 9. Zakkaryz vence com 25 de vida.",
    participantIds: ["zakkaryz", "tapioca"],
    category: "mixed",
    durationSeconds: 13,
  }),
  clip({
    id: "hour3-16",
    title: "Duas balas crocantes",
    description: "Zakkaryz emenda dois headshots em rounds seguidos, com direito à reação da call.",
    participantIds: ["zakkaryz"],
    category: "mixed",
    durationSeconds: 20,
  }),
  clip({
    id: "hour3-17",
    title: "O corredor é do Zakkaryz",
    description: "Zakkaryz segura a linha e resolve a abertura com um tiro na cabeça.",
    participantIds: ["zakkaryz"],
    category: "skill",
    durationSeconds: 12,
  }),
  clip({
    id: "hour3-18",
    title: "De longe, na cabeça",
    description: "Zakkaryz volta da base e diminui a diferença com um headshot à distância.",
    participantIds: ["zakkaryz"],
    category: "skill",
    durationSeconds: 11,
  }),
  clip({
    id: "hour3-19",
    title: "Tapioca sem perder vida",
    description: "No duelo de Sheriff contra Musashi, Tapioca acerta o headshot e termina com 100 de vida.",
    participantIds: ["tapioca"],
    category: "skill",
    durationSeconds: 11,
  }),
  clip({
    id: "hour3-20",
    title: "O último round do pacote",
    description: "Musashi garante o último abate contra Tapioca e comemora com spray de capivara.",
    participantIds: ["musashi", "tapioca"],
    category: "mixed",
    durationSeconds: 13,
  }),
];
