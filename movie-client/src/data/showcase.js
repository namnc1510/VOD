const episodeSuffixes = [
  'Khoi dau',
  'Manh ghep bi an',
  'Cua so dem',
  'Tin hieu quay lai',
  'Duong bien gioi',
  'Cham toi diem roi'
];

const previewCommentAuthors = [
  { name: 'Minh Chau', badge: 'VIP', mood: 'Hype' },
  { name: 'Bao Han', badge: 'Movie Buff', mood: 'Review' },
  { name: 'Quoc Dat', badge: 'Moderator', mood: 'Pinned' },
  { name: 'Linh Nhi', badge: 'Fan Club', mood: 'Fresh' }
];

const paymentBaseMethods = [
  {
    id: 'vnpay-qr',
    title: 'VNPAY QR',
    icon: 'qr_code_2',
    accent: 'primary',
    note: 'Quet QR tren mobile banking va kich hoat goi gan nhu ngay lap tuc.'
  },
  {
    id: 'atm',
    title: 'ATM / Tai khoan noi dia',
    icon: 'account_balance',
    accent: 'slate',
    note: 'Phu hop cho luong thanh toan trong nuoc va duoc redirect qua cong an toan.'
  },
  {
    id: 'international',
    title: 'Visa / Mastercard',
    icon: 'credit_card',
    accent: 'amber',
    note: 'Thanh toan quoc te cho nguoi dung can nang cap nhanh tren nhieu thiet bi.'
  }
];

const paymentFlow = [
  {
    id: 'select',
    title: 'Chon goi phu hop',
    copy: 'So sanh gia, quyen loi va chu ky truoc khi mo checkout.'
  },
  {
    id: 'redirect',
    title: 'Redirect sang cong thanh toan',
    copy: 'Client gui yeu cau, backend tao phien va dieu huong qua VNPAY.'
  },
  {
    id: 'confirm',
    title: 'Dong bo goi trong tai khoan',
    copy: 'Sau khi thanh cong, profile duoc refresh de hien dung plan moi.'
  }
];

const paymentHighlights = [
  { label: 'Kich hoat trung binh', value: '30s', icon: 'bolt' },
  { label: 'Ty le giao dich hoan tat', value: '98.4%', icon: 'verified' },
  { label: 'Ho tro sau thanh toan', value: '24/7', icon: 'support_agent' }
];

function titleRoot(movie) {
  const raw = String(movie?.title || 'Series').trim();
  return raw.split(':')[0].trim() || raw;
}

function safeEpisodeLength(durationSeconds, fallbackMinutes) {
  if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return Math.max(18, Math.round(durationSeconds / 60));
  }
  return fallbackMinutes;
}

export function buildEpisodeShowcase(movie, sourceEpisodes = []) {
  const normalizedEpisodes = Array.isArray(sourceEpisodes)
    ? sourceEpisodes
        .filter(Boolean)
        .map((episode, index) => ({
          id: episode.id || `episode-${index + 1}`,
          epNo: Number(episode.epNo) || index + 1,
          title: episode.title || `Episode ${index + 1}`,
          durationMinutes: safeEpisodeLength(episode.durationSeconds, 42 + (index % 3) * 4),
          streamLabel: episode.serverName || `Server ${((index % 3) + 1)}`,
          availability: index < 2 ? 'Now streaming' : index < 5 ? 'Weekly drop' : 'Library',
          preview: false
        }))
    : [];

  if (normalizedEpisodes.length > 0) {
    const totalMinutes = normalizedEpisodes.reduce((sum, episode) => sum + episode.durationMinutes, 0);

    return {
      isFallback: false,
      title: 'Episode line-up',
      description: 'Danh sach tap dang lay tu backend, bo sung them metadata de panel day dan hon.',
      items: normalizedEpisodes,
      stats: [
        { label: 'Tong tap', value: String(normalizedEpisodes.length).padStart(2, '0'), icon: 'movie' },
        { label: 'Tong thoi luong', value: `${Math.max(1, Math.round(totalMinutes / 60))}h`, icon: 'schedule' },
        { label: 'Lich phat', value: 'Cap nhat thu 6', icon: 'event' }
      ]
    };
  }

  const fallbackItems = Array.from({ length: 6 }, (_, index) => ({
    id: `preview-${index + 1}`,
    epNo: index + 1,
    title: `${titleRoot(movie)} ${episodeSuffixes[index % episodeSuffixes.length]}`,
    durationMinutes: 42 + (index % 3) * 4,
    streamLabel: index < 2 ? 'Early access' : 'Preview slot',
    availability: index < 3 ? 'San sang' : 'Sap len song',
    preview: true
  }));

  return {
    isFallback: true,
    title: 'Episode preview data',
    description: 'Backend chua tra danh sach tap. Dang hien data mau de giao dien khong bi trong.',
    items: fallbackItems,
    stats: [
      { label: 'Tong tap demo', value: '06', icon: 'gallery_thumbnail' },
      { label: 'Mua dang mo', value: 'Season 1', icon: 'featured_play_list' },
      { label: 'Trang thai', value: 'Preview UI', icon: 'visibility' }
    ]
  };
}

export function buildCommentShowcase(movie, commentsState = { items: [], total: 0 }) {
  const sourceItems = Array.isArray(commentsState?.items) ? commentsState.items.filter(Boolean) : [];
  const totalCount = Number(commentsState?.total) || sourceItems.length;
  const topicSeed = Array.isArray(movie?.genres) && movie.genres.length
    ? movie.genres.slice(0, 3).map((genre) => genre.name || genre).filter(Boolean)
    : ['Plot twist', 'Visual', 'Soundtrack'];

  if (sourceItems.length > 0) {
    return {
      isFallback: false,
      items: sourceItems,
      stats: [
        { label: 'Tong binh luan', value: String(totalCount).padStart(2, '0'), icon: 'forum' },
        { label: 'Do soi dong', value: 'High', icon: 'trending_up' },
        { label: 'Topic noi bat', value: topicSeed[0] || 'Story', icon: 'bolt' }
      ],
      chips: topicSeed
    };
  }

  const rootTitle = titleRoot(movie);
  const fallbackItems = previewCommentAuthors.map((author, index) => ({
    id: `preview-comment-${index + 1}`,
    user: {
      name: author.name
    },
    createdAt: new Date(Date.now() - (index + 1) * 1000 * 60 * 38).toISOString(),
    content:
      index === 0
        ? `Phan mo dau cua ${rootTitle} len nhac va tiet tau cat canh rat da. Neu giu duoc form nay thi xem rat cuon.`
        : index === 1
          ? `Toc do ke chuyen on, mau phim dep va phan dialog de nho. Minh mong tap sau day them conflict.`
          : index === 2
            ? `Ban nay nen co them recap ngan o dau tap de nguoi moi vao van theo kip.`
            : `Chemistry giua dan nhan vat trong ${rootTitle} on hon mong doi. Phan am thanh va subtitle kha sach.`,
    badge: author.badge,
    mood: author.mood,
    likes: 18 - index * 3
  }));

  return {
    isFallback: true,
    items: fallbackItems,
    stats: [
      { label: 'Community pulse', value: 'Demo', icon: 'chat' },
      { label: 'Muc do tich cuc', value: '96%', icon: 'sentiment_satisfied' },
      { label: 'Topic noi bat', value: topicSeed[0] || 'Visual', icon: 'theater_comedy' }
    ],
    chips: topicSeed
  };
}

export function getPaymentMethods() {
  return paymentBaseMethods;
}

export function getPaymentFlow() {
  return paymentFlow;
}

export function getPaymentHighlights() {
  return paymentHighlights;
}

export function buildPaymentActivity(planEntries = [], isAnnual = false) {
  const visiblePlans = Array.isArray(planEntries) && planEntries.length > 0
    ? planEntries
    : [
        { label: 'Premium', price: 149000 },
        { label: 'Ultimate', price: 249000 },
        { label: 'Standard', price: 79000 }
      ];

  return visiblePlans.slice(0, 3).map((plan, index) => ({
    id: `activity-${plan.label}-${index + 1}`,
    customer: ['Lan Anh', 'Hoang Nam', 'Gia Bao'][index] || 'Cinema User',
    plan: plan.label,
    amount: plan.price,
    cycle: isAnnual ? 'Annual' : 'Monthly',
    status: index === 0 ? 'Confirmed' : index === 1 ? 'Processing' : 'Queued',
    time: `${(index + 1) * 6}m ago`
  }));
}

export function buildPaymentReceipt(selectedPlan, selectedPrice, isAnnual) {
  const subtotal = Number(selectedPrice) || 0;
  const serviceFee = subtotal > 0 ? 0 : 0;
  const discount = isAnnual && subtotal > 0 ? Math.round(subtotal * 0.08) : 0;
  const total = Math.max(0, subtotal + serviceFee - discount);

  return [
    { label: 'Goi', value: selectedPlan?.label || 'Chua chon', type: 'text' },
    { label: 'Chu ky', value: isAnnual ? 'Annual billing' : 'Monthly billing', type: 'text' },
    { label: 'Phi cong thanh toan', value: serviceFee, type: 'money' },
    { label: 'Uu dai', value: discount, type: 'discount' },
    { label: 'Tong tam tinh', value: total, type: 'money', emphasis: true }
  ];
}
