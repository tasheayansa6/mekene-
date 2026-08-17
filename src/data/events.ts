export interface EventData {
  slug: string;
  title: string;
  date: string;
  endDate?: string;
  location?: string;
  description: string;
  isRecurring?: boolean;
  fullDescription?: string;
}

export const eventsData: EventData[] = [
  {
    slug: 'divine-liturgy-sunday',
    title: 'Sunday Divine Liturgy',
    date: '2025-08-17',
    location: 'Main Sanctuary',
    description:
      'Join us for the weekly Sunday Divine Liturgy with the full Ethiopian Orthodox liturgical service.',
    isRecurring: true,
    fullDescription:
      'Join us every Sunday for the Divine Liturgy (Qedase), the central act of worship in the Ethiopian Orthodox Tewahedo Church. Our clergy lead the congregation through the ancient and beautiful liturgical service, including prayers, hymns (Zema), scripture readings, and the Holy Communion. The Divine Liturgy is a sacred time where heaven and earth meet, and all are welcome to participate in this holy celebration. Please arrive early to prepare your heart for worship.',
  },
  {
    slug: 'youth-fellowship-august',
    title: 'Youth Fellowship Gathering',
    date: '2025-08-20',
    location: 'Church Hall',
    description:
      'A time of worship, fellowship, and Bible study for young adults ages 18-35.',
    fullDescription:
      'Our Youth Fellowship Gathering brings together young adults ages 18-35 for an evening of worship, Bible study, and meaningful fellowship. This is a space to ask questions, share experiences, and grow together in the Orthodox faith. Each gathering includes contemporary worship songs, a teaching or discussion on a relevant topic, and time for prayer and socializing. Light refreshments are provided. Whether you are a lifelong member or new to the faith, you are warmly welcome.',
  },
  {
    slug: 'community-outreach-day',
    title: 'Community Outreach Day',
    date: '2025-08-24',
    endDate: '2025-08-24',
    location: 'Community Center',
    description:
      'Serving our neighbors through food distribution, health screenings, and fellowship.',
    fullDescription:
      'Our monthly Community Outreach Day is an opportunity to put our faith into action by serving our neighbors. Volunteers gather at the Community Center to distribute food packages to families in need, provide basic health screenings, and offer a warm meal and fellowship. This ministry is open to all who wish to serve — no special skills required, only a willing heart. Please contact the Outreach Ministry team if you would like to volunteer or if you know someone in need.',
  },
  {
    slug: 'feast-of-mary-august',
    title: 'Feast of the Assumption of St. Mary',
    date: '2025-08-29',
    location: 'Main Sanctuary',
    description:
      'Celebrating the feast of the Assumption of the Virgin Mary with special liturgical services.',
    fullDescription:
      'The Feast of the Assumption of St. Mary (Filseta) is one of the most beloved feasts in the Ethiopian Orthodox Tewahedo Church. We celebrate the Dormition and Assumption of the Virgin Mary, the Mother of God, with special liturgical services including the chanting of hymns dedicated to St. Mary, the reading of her praises (Weddase Maryam), and the celebration of the Divine Liturgy. This feast is preceded by a period of fasting and prayer. All faithful are encouraged to attend and receive the blessings of this holy day.',
  },
  {
    slug: 'bible-study-series',
    title: 'Bible Study Series: The Gospel of John',
    date: '2025-09-03',
    endDate: '2025-09-24',
    location: 'Church Hall',
    description:
      'A four-week series exploring the Gospel of John and its significance in our faith.',
    fullDescription:
      'Join us for a four-week Bible study series diving deep into the Gospel of John. This series will explore the unique theological themes of John\'s Gospel — the Word made flesh, the "I Am" sayings of Jesus, the symbolism of signs and miracles, and the profound teachings on love, unity, and eternal life. Each session includes a teaching, group discussion, and personal reflection time. Study guides will be provided. All are welcome, whether you are new to Bible study or a seasoned student of Scripture. Sessions run every Wednesday evening from September 3 through September 24.',
  },
  {
    slug: 'annual-conference-2025',
    title: 'Annual Church Conference',
    date: '2025-09-12',
    endDate: '2025-09-14',
    location: 'Main Sanctuary',
    description:
      'Three days of worship, teaching, fellowship, and planning for the future of our church.',
    fullDescription:
      'Our Annual Church Conference is the highlight of the church calendar — three days dedicated to worship, biblical teaching, fellowship, and strategic planning for the future of Busa Mekenene Eyasus Church. This year\'s theme is "Growing Together in Faith and Love." The conference features guest speakers, interactive workshops, youth and children\'s programs, prayer sessions, and a special farewell banquet. Whether you are a long-time member or a first-time visitor, this is a wonderful opportunity to connect with the church family and be spiritually refreshed. Registration is now open at the church office.',
  },
];

export const pastEventsData: EventData[] = [
  {
    slug: 'ethiopian-christmas-2025',
    title: 'Ethiopian Christmas (Genna)',
    date: '2025-01-07',
    location: 'Main Sanctuary',
    description:
      'Celebrated the birth of our Lord Jesus Christ with the traditional Divine Liturgy and festive gathering.',
    fullDescription:
      'On January 7, we celebrated Ethiopian Christmas (Genna) with a beautiful Divine Liturgy attended by the full congregation. The service was followed by a festive gathering where families shared food and fellowship. This was a joyous celebration of our Lord\'s birth in the rich tradition of the Ethiopian Orthodox Tewahedo Church.',
  },
  {
    slug: 'epiphany-timkat-2025',
    title: 'Epiphany (Timkat)',
    date: '2025-01-19',
    location: 'Main Sanctuary & Outdoor',
    description:
      'Celebrated the Baptism of Christ with the traditional Timkat procession and water blessing.',
    fullDescription:
      'Timkat, the feast of the Epiphany, is the greatest festival of the year in the Ethiopian Orthodox Church. We commemorated the Baptism of Christ with a colorful procession carrying the Tabot, the chanting of sacred hymns, and the traditional blessing of water. Hundreds of faithful gathered for this joyous celebration that renews our own baptismal covenant.',
  },
];

export function getEventBySlug(slug: string): EventData | undefined {
  return eventsData.find((e) => e.slug === slug) ?? pastEventsData.find((e) => e.slug === slug);
}
