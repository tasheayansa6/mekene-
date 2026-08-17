export type SermonCategory =
  | 'Sunday Sermon'
  | 'Bible Study'
  | 'Feast Day'
  | 'Special Event';

export interface SermonData {
  slug: string;
  title: string;
  speaker: string;
  date: string;
  description: string;
  fullDescription?: string;
  scriptureReference?: string;
  category: SermonCategory;
  thumbnailUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
}

export const sermonsData: SermonData[] = [
  {
    slug: 'power-of-faith-in-daily-life',
    title: 'The Power of Faith in Daily Life',
    speaker: 'Father Samuel Tesfaye',
    date: '2025-08-10',
    description:
      'Exploring how faith guides our everyday decisions and strengthens our relationship with God.',
    fullDescription:
      'In this powerful sermon, Father Samuel Tesfaye explores the transformative power of faith in our daily lives. Drawing from the Epistle to the Hebrews and the teachings of the Ethiopian Orthodox Church fathers, he explains how faith is not merely a belief but an active trust that shapes every decision we make. From morning prayers to our interactions with neighbors, faith provides the foundation for a life that is pleasing to God. Father Samuel shares practical examples from the lives of Ethiopian saints — including the great Abune Tekle Haymanot — who demonstrated unwavering faith in the most challenging circumstances.',
    scriptureReference: 'Hebrews 11:1-6, Matthew 17:20',
    category: 'Sunday Sermon',
    videoUrl: '#',
  },
  {
    slug: 'walking-in-the-light-of-christ',
    title: 'Walking in the Light of Christ',
    speaker: 'Father Samuel Tesfaye',
    date: '2025-08-03',
    description:
      'A sermon on living according to the teachings of our Lord Jesus Christ.',
    fullDescription:
      'Father Samuel delivers a moving sermon on what it means to truly walk in the light of Christ. Using the Gospel of John and the writings of St. John Chrysostom, he paints a vivid picture of the Christian life as a journey illuminated by the presence of God. He discusses how the Ethiopian Orthodox Tewahedo Church, through its liturgy, sacraments, and traditions, provides the light we need to navigate the darkness of this world. This sermon calls believers to examine their daily walk and recommit to following the path of righteousness.',
    scriptureReference: 'John 8:12, 1 John 1:5-7, Ephesians 5:8-14',
    category: 'Sunday Sermon',
    videoUrl: '#',
  },
  {
    slug: 'the-blessing-of-community',
    title: 'The Blessing of Community',
    speaker: 'Deacon Daniel Tadesse',
    date: '2025-07-27',
    description:
      'How the church community strengthens our faith and provides support in times of need.',
    fullDescription:
      'Deacon Daniel Tadesse shares an inspiring message about the blessing of being part of the church community. Rooted in the Ethiopian Orthodox understanding of the church as the Body of Christ, this sermon explores how our faith is deepened through fellowship, mutual support, and shared worship. He draws on the example of the early Christian community described in the Acts of the Apostles and connects it to the vibrant communal life of the Ethiopian Orthodox Church, where fasting, prayer, and celebration are shared experiences that bind the faithful together.',
    scriptureReference: 'Acts 2:42-47, Hebrews 10:24-25, Ecclesiastes 4:9-12',
    category: 'Sunday Sermon',
  },
  {
    slug: 'prayer-as-a-way-of-life',
    title: 'Prayer as a Way of Life',
    speaker: 'Father Samuel Tesfaye',
    date: '2025-07-20',
    description:
      'Understanding the importance of constant prayer in the Ethiopian Orthodox tradition.',
    fullDescription:
      'In this profound teaching, Father Samuel explores the central role of prayer in the Ethiopian Orthodox Tewahedo tradition. From the canonical hours of prayer observed by monks and laity alike, to the spontaneous prayers of the heart, this sermon illuminates how prayer is meant to permeate every moment of our lives. Father Samuel discusses the unique prayer traditions of the Ethiopian Church, including the use of prayer sticks (mequamia), the Sign of the Cross, and the powerful intercessions of the Virgin Mary and the saints. He encourages all believers to develop a disciplined prayer life.',
    scriptureReference: '1 Thessalonians 5:16-18, Psalm 55:17, Matthew 6:5-13',
    category: 'Bible Study',
  },
  {
    slug: 'the-sacraments-of-our-church',
    title: 'The Sacraments of Our Church',
    speaker: 'Father Samuel Tesfaye',
    date: '2025-07-13',
    description:
      'An overview of the seven sacraments (Mysteries) of the Ethiopian Orthodox Tewahedo Church.',
    fullDescription:
      'Father Samuel provides a comprehensive overview of the seven sacraments (known as Mysteries — Qedusan Mysteries) of the Ethiopian Orthodox Tewahedo Church: Baptism, Chrismation (Myron), Holy Communion (Qurban), Repentance and Confession, Holy Orders, Holy Matrimony, and Anointing of the Sick. Each sacrament is explained in the context of Ethiopian Orthodox theology, with references to the church fathers and the traditional practices that make the Ethiopian liturgical tradition unique among Christian churches. This sermon is an essential introduction for anyone seeking to understand the spiritual depth of our faith.',
    scriptureReference: 'John 3:5, 1 Corinthians 11:23-29, James 5:14-15',
    category: 'Bible Study',
    videoUrl: '#',
  },
  {
    slug: 'love-one-another',
    title: 'Love One Another',
    speaker: 'Deacon Daniel Tadesse',
    date: '2025-07-06',
    description:
      "A teaching on Christ's commandment to love one another as He loved us.",
    fullDescription:
      "Deacon Daniel Tadesse delivers a heartfelt sermon on Christ's new commandment to love one another. Drawing from the Gospel of John and the teachings of the Ethiopian Orthodox Church, he explores the different dimensions of Christian love — love for God, love for neighbor, and love for enemy. He connects this teaching to the Ethiopian concept of 'Fikir' (love) and how our culture's emphasis on communal harmony reflects the Gospel call to sacrificial love. This sermon challenges every believer to examine the quality of their love and take practical steps to live out this central commandment of our Lord.",
    scriptureReference: 'John 13:34-35, 1 Corinthians 13:1-13, 1 John 4:7-21',
    category: 'Sunday Sermon',
  },
];

export function getSermonBySlug(slug: string): SermonData | undefined {
  return sermonsData.find((s) => s.slug === slug);
}

export function getRelatedSermons(
  currentSlug: string,
  limit = 3
): SermonData[] {
  const current = getSermonBySlug(currentSlug);
  if (!current) return sermonsData.slice(0, limit);
  return sermonsData
    .filter(
      (s) =>
        s.slug !== currentSlug &&
        (s.speaker === current.speaker || s.category === current.category)
    )
    .slice(0, limit);
}
