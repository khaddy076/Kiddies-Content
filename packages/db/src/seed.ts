/**
 * Seed script for Kiddies Content database.
 *
 * Run with:
 *   npx tsx src/seed.ts
 *
 * Requires DATABASE_URL env var or uses the default local connection.
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const connectionString =
  process.env['DATABASE_URL'] ??
  'postgresql://kiddies:kiddies_secret@localhost:5432/kiddies_content';

const client = postgres(connectionString);
const db = drizzle(client, { schema });

// ─── Sample data ──────────────────────────────────────────────────────────────

/**
 * 10 real kid-friendly YouTube video IDs with associated metadata.
 * Channels: Cocomelon, National Geographic Kids, TED-Ed, Khan Academy Kids,
 * PBS Kids, Blippi, SciShow Kids, Numberblocks, Alphablocks, Art for Kids Hub.
 */
const YOUTUBE_VIDEOS = [
  {
    platformContentId: 'e_04ZrNroTo',
    title: 'Wheels On The Bus | CoComelon Nursery Rhymes & Kids Songs',
    description:
      'A classic nursery rhyme animated for young children. Great for toddlers learning about vehicles and everyday routines.',
    channelName: 'Cocomelon - Nursery Rhymes',
    channelId: 'UCbCmjCuTUZos6Inko4u57UQ',
    thumbnailUrl: 'https://i.ytimg.com/vi/e_04ZrNroTo/hqdefault.jpg',
    durationSeconds: 137,
    publishedAt: new Date('2018-06-01T00:00:00Z'),
    categoryId: 10,
    categoryLabel: 'Music',
    tags: ['nursery rhyme', 'wheels on the bus', 'kids songs', 'toddler', 'animation'],
    language: 'en',
    contentRating: 'G',
    ageMinRecommended: 1,
    ageMaxRecommended: 5,
    aiSafetyScore: 0.99,
    aiSafetyLabels: { violence: 0.0, language: 0.0, sexualContent: 0.0, spam: 0.01, overall: 0.99 },
  },
  {
    platformContentId: 'RcNeh57i7zs',
    title: 'Amazing Animals for Kids | National Geographic Kids',
    description:
      'Explore the animal kingdom with stunning footage and fun facts about amazing creatures from around the world.',
    channelName: 'National Geographic Kids',
    channelId: 'UCXrdGVxGAHVVpsq9dMCO3lA',
    thumbnailUrl: 'https://i.ytimg.com/vi/RcNeh57i7zs/hqdefault.jpg',
    durationSeconds: 480,
    publishedAt: new Date('2020-03-15T00:00:00Z'),
    categoryId: 15,
    categoryLabel: 'Pets & Animals',
    tags: ['animals', 'nature', 'kids', 'educational', 'national geographic'],
    language: 'en',
    contentRating: 'G',
    ageMinRecommended: 4,
    ageMaxRecommended: 12,
    aiSafetyScore: 0.98,
    aiSafetyLabels: { violence: 0.01, language: 0.0, sexualContent: 0.0, spam: 0.01, overall: 0.98 },
  },
  {
    platformContentId: 'MnP6TkRLQ3c',
    title: 'How Does the Sun Work? | TED-Ed',
    description:
      "A clear and engaging explanation of nuclear fusion in our Sun, told through beautiful animation perfect for curious older children.",
    channelName: 'TED-Ed',
    channelId: 'UCsooa4yRKGN_zEE8iknghZA',
    thumbnailUrl: 'https://i.ytimg.com/vi/MnP6TkRLQ3c/hqdefault.jpg',
    durationSeconds: 304,
    publishedAt: new Date('2013-09-30T00:00:00Z'),
    categoryId: 27,
    categoryLabel: 'Education',
    tags: ['sun', 'science', 'TED-Ed', 'education', 'space', 'nuclear fusion'],
    language: 'en',
    contentRating: 'G',
    ageMinRecommended: 10,
    ageMaxRecommended: 18,
    aiSafetyScore: 0.99,
    aiSafetyLabels: { violence: 0.0, language: 0.0, sexualContent: 0.0, spam: 0.0, overall: 0.99 },
  },
  {
    platformContentId: 'dCpSAGBjEQo',
    title: 'Adding and Subtracting Fractions | Khan Academy',
    description:
      'Learn how to add and subtract fractions with unlike denominators. Clear step-by-step practice problems.',
    channelName: 'Khan Academy',
    channelId: 'UC4a-Gbdw7vOaccHmFo40b9g',
    thumbnailUrl: 'https://i.ytimg.com/vi/dCpSAGBjEQo/hqdefault.jpg',
    durationSeconds: 410,
    publishedAt: new Date('2015-08-20T00:00:00Z'),
    categoryId: 27,
    categoryLabel: 'Education',
    tags: ['fractions', 'math', 'khan academy', 'education', 'elementary school'],
    language: 'en',
    contentRating: 'G',
    ageMinRecommended: 7,
    ageMaxRecommended: 14,
    aiSafetyScore: 0.99,
    aiSafetyLabels: { violence: 0.0, language: 0.0, sexualContent: 0.0, spam: 0.0, overall: 0.99 },
  },
  {
    platformContentId: 'hl-cyaJxMGU',
    title: 'Dinosaur Train | Full Episode | PBS Kids',
    description:
      'Buddy and his family explore the Cretaceous Period and learn about new dinosaur friends. Great for early learners.',
    channelName: 'PBS Kids',
    channelId: 'UCbKo3HsaBqon3IG1cRZG0ig',
    thumbnailUrl: 'https://i.ytimg.com/vi/hl-cyaJxMGU/hqdefault.jpg',
    durationSeconds: 1350,
    publishedAt: new Date('2019-11-01T00:00:00Z'),
    categoryId: 1,
    categoryLabel: 'Film & Animation',
    tags: ['dinosaur', 'PBS Kids', 'preschool', 'cartoon', 'dinosaur train'],
    language: 'en',
    contentRating: 'G',
    ageMinRecommended: 3,
    ageMaxRecommended: 7,
    aiSafetyScore: 0.97,
    aiSafetyLabels: { violence: 0.01, language: 0.0, sexualContent: 0.0, spam: 0.02, overall: 0.97 },
  },
  {
    platformContentId: 'sRibb1zVXtM',
    title: 'Learning Colors with Blippi | Colors for Kids',
    description:
      'Blippi teaches colors through fun and engaging activities. Perfect for toddlers starting to learn their colors.',
    channelName: 'Blippi - Educational Videos for Kids',
    channelId: 'UC5LkqVs7PuMiMBMgKI1oDOg',
    thumbnailUrl: 'https://i.ytimg.com/vi/sRibb1zVXtM/hqdefault.jpg',
    durationSeconds: 720,
    publishedAt: new Date('2017-04-10T00:00:00Z'),
    categoryId: 27,
    categoryLabel: 'Education',
    tags: ['colors', 'blippi', 'toddler', 'learning', 'educational'],
    language: 'en',
    contentRating: 'G',
    ageMinRecommended: 2,
    ageMaxRecommended: 6,
    aiSafetyScore: 0.98,
    aiSafetyLabels: { violence: 0.0, language: 0.0, sexualContent: 0.0, spam: 0.02, overall: 0.98 },
  },
  {
    platformContentId: 'jlNDzqcRoHI',
    title: 'The Science of Rainbows | SciShow Kids',
    description:
      'Why do rainbows form? SciShow Kids breaks down the science of light and refraction in a way young learners can understand.',
    channelName: 'SciShow Kids',
    channelId: 'UCZVojhlAVPtpFJ9TBJgGK2A',
    thumbnailUrl: 'https://i.ytimg.com/vi/jlNDzqcRoHI/hqdefault.jpg',
    durationSeconds: 234,
    publishedAt: new Date('2016-07-05T00:00:00Z'),
    categoryId: 27,
    categoryLabel: 'Education',
    tags: ['rainbows', 'science', 'scishow kids', 'light', 'physics', 'education'],
    language: 'en',
    contentRating: 'G',
    ageMinRecommended: 5,
    ageMaxRecommended: 10,
    aiSafetyScore: 0.99,
    aiSafetyLabels: { violence: 0.0, language: 0.0, sexualContent: 0.0, spam: 0.0, overall: 0.99 },
  },
  {
    platformContentId: 'W2IJFHGkZ4g',
    title: 'Numberblocks - Learn to Count | Series 1 Full Episodes',
    description:
      'The Numberblocks are a group of characters who teach counting and basic maths concepts through lively adventures.',
    channelName: 'Numberblocks',
    channelId: 'UCPlwvN0w4qFSP1FllALB92w',
    thumbnailUrl: 'https://i.ytimg.com/vi/W2IJFHGkZ4g/hqdefault.jpg',
    durationSeconds: 2340,
    publishedAt: new Date('2021-01-15T00:00:00Z'),
    categoryId: 1,
    categoryLabel: 'Film & Animation',
    tags: ['numberblocks', 'counting', 'math', 'preschool', 'CBeebies'],
    language: 'en',
    contentRating: 'G',
    ageMinRecommended: 2,
    ageMaxRecommended: 6,
    aiSafetyScore: 1.0,
    aiSafetyLabels: { violence: 0.0, language: 0.0, sexualContent: 0.0, spam: 0.0, overall: 1.0 },
  },
  {
    platformContentId: 'FXAnFp4EjuQ',
    title: 'Alphablocks - Learn to Read | Alphabet Series',
    description:
      'The Alphablocks are 26 living letters who discover that when they hold hands and say their sounds, they make words.',
    channelName: 'Alphablocks',
    channelId: 'UC8JJGKMDMJa6yqMkTlJxRsA',
    thumbnailUrl: 'https://i.ytimg.com/vi/FXAnFp4EjuQ/hqdefault.jpg',
    durationSeconds: 1800,
    publishedAt: new Date('2021-02-20T00:00:00Z'),
    categoryId: 1,
    categoryLabel: 'Film & Animation',
    tags: ['alphablocks', 'reading', 'phonics', 'alphabet', 'preschool', 'CBeebies'],
    language: 'en',
    contentRating: 'G',
    ageMinRecommended: 3,
    ageMaxRecommended: 7,
    aiSafetyScore: 1.0,
    aiSafetyLabels: { violence: 0.0, language: 0.0, sexualContent: 0.0, spam: 0.0, overall: 1.0 },
  },
  {
    platformContentId: 'GzL6KjApFrk',
    title: 'How to Draw a Dragon | Art for Kids Hub',
    description:
      'Step-by-step instructions for drawing a cartoon dragon. Great for kids who love art and want to improve their drawing skills.',
    channelName: 'Art for Kids Hub',
    channelId: 'UCNDeO5vnYKN2SgN7ClO-fmw',
    thumbnailUrl: 'https://i.ytimg.com/vi/GzL6KjApFrk/hqdefault.jpg',
    durationSeconds: 540,
    publishedAt: new Date('2019-06-12T00:00:00Z'),
    categoryId: 27,
    categoryLabel: 'Education',
    tags: ['drawing', 'art', 'dragon', 'kids', 'how to draw', 'art for kids hub'],
    language: 'en',
    contentRating: 'G',
    ageMinRecommended: 5,
    ageMaxRecommended: 14,
    aiSafetyScore: 0.99,
    aiSafetyLabels: { violence: 0.0, language: 0.0, sexualContent: 0.0, spam: 0.01, overall: 0.99 },
  },
];

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding database...');

  // ── 1. Parent users ────────────────────────────────────────────────────────
  console.log('  Creating parent users...');

  const [parent1User, parent2User] = await db
    .insert(schema.users)
    .values([
      {
        role: 'parent',
        email: 'sarah.johnson@example.com',
        phone: '+14155552671',
        // bcrypt hash of "Password123!" (pre-computed for seeding)
        passwordHash: '$2b$10$K7L/8Y0uoFqtI5JH1bIdyexample1hashsarahjohnson',
        displayName: 'Sarah Johnson',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
        isActive: true,
        isVerified: true,
      },
      {
        role: 'parent',
        email: 'david.okafor@example.com',
        phone: '+12125559834',
        passwordHash: '$2b$10$K7L/8Y0uoFqtI5JH1bIdyexample2hashdavidokafor',
        displayName: 'David Okafor',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
        isActive: true,
        isVerified: true,
      },
    ])
    .returning();

  if (!parent1User || !parent2User) {
    throw new Error('Failed to insert parent users');
  }

  // ── 2. Parent profiles ─────────────────────────────────────────────────────
  console.log('  Creating parent profiles...');

  await db.insert(schema.parentProfiles).values([
    {
      userId: parent1User.id,
      religion: 'Christianity',
      incomeBracket: 'middle',
      countryCode: 'US',
      region: 'California',
      languagePreference: 'en',
      profileVisibility: 'community',
    },
    {
      userId: parent2User.id,
      religion: 'Islam',
      incomeBracket: 'upper-middle',
      countryCode: 'US',
      region: 'New York',
      languagePreference: 'en',
      profileVisibility: 'private',
    },
  ]);

  // ── 3. Child users ──────────────────────────────────────────────────────────
  console.log('  Creating child users...');

  const [child1User, child2User, child3User] = await db
    .insert(schema.users)
    .values([
      {
        role: 'child',
        email: null,
        phone: null,
        pinHash: '$2b$10$example_pin_hash_for_emma',
        displayName: 'Emma',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=emma',
        isActive: true,
        isVerified: false,
      },
      {
        role: 'child',
        email: null,
        phone: null,
        pinHash: '$2b$10$example_pin_hash_for_liam',
        displayName: 'Liam',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=liam',
        isActive: true,
        isVerified: false,
      },
      {
        role: 'child',
        email: null,
        phone: null,
        pinHash: '$2b$10$example_pin_hash_for_aisha',
        displayName: 'Aisha',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=aisha',
        isActive: true,
        isVerified: false,
      },
    ])
    .returning();

  if (!child1User || !child2User || !child3User) {
    throw new Error('Failed to insert child users');
  }

  // ── 4. Child profiles ───────────────────────────────────────────────────────
  console.log('  Creating child profiles...');

  await db.insert(schema.childProfiles).values([
    {
      userId: child1User.id,
      parentId: parent1User.id,
      dateOfBirth: '2019-03-14', // age 5 → preschool
      ageGroup: 'preschool',
      screenTimeDailyLimitMinutes: 60,
      isCoppaSubject: true,
    },
    {
      userId: child2User.id,
      parentId: parent1User.id,
      dateOfBirth: '2015-07-22', // age 9 → early-school
      ageGroup: 'early-school',
      screenTimeDailyLimitMinutes: 90,
      isCoppaSubject: false,
    },
    {
      userId: child3User.id,
      parentId: parent2User.id,
      dateOfBirth: '2013-11-05', // age 11 → tween
      ageGroup: 'tween',
      screenTimeDailyLimitMinutes: 120,
      isCoppaSubject: false,
    },
  ]);

  // ── 5. Screen time schedules ────────────────────────────────────────────────
  console.log('  Creating screen time schedules...');

  // Weekday schedule for Emma (child1): 15:00–18:00
  // Weekend schedule for Emma: 09:00–12:00
  await db.insert(schema.screenTimeSchedules).values([
    {
      childId: child1User.id,
      dayOfWeek: 1, // Monday
      allowedStart: '15:00',
      allowedEnd: '18:00',
      createdBy: parent1User.id,
    },
    {
      childId: child1User.id,
      dayOfWeek: 2, // Tuesday
      allowedStart: '15:00',
      allowedEnd: '18:00',
      createdBy: parent1User.id,
    },
    {
      childId: child1User.id,
      dayOfWeek: 3, // Wednesday
      allowedStart: '15:00',
      allowedEnd: '18:00',
      createdBy: parent1User.id,
    },
    {
      childId: child1User.id,
      dayOfWeek: 4, // Thursday
      allowedStart: '15:00',
      allowedEnd: '18:00',
      createdBy: parent1User.id,
    },
    {
      childId: child1User.id,
      dayOfWeek: 5, // Friday
      allowedStart: '15:00',
      allowedEnd: '19:00',
      createdBy: parent1User.id,
    },
    {
      childId: child1User.id,
      dayOfWeek: 6, // Saturday
      allowedStart: '09:00',
      allowedEnd: '12:00',
      createdBy: parent1User.id,
    },
    {
      childId: child1User.id,
      dayOfWeek: 0, // Sunday
      allowedStart: '09:00',
      allowedEnd: '12:00',
      createdBy: parent1User.id,
    },
    // Liam (child2) weekday evenings
    {
      childId: child2User.id,
      dayOfWeek: 1,
      allowedStart: '16:00',
      allowedEnd: '19:30',
      createdBy: parent1User.id,
    },
    {
      childId: child2User.id,
      dayOfWeek: 6,
      allowedStart: '08:00',
      allowedEnd: '12:00',
      createdBy: parent1User.id,
    },
    {
      childId: child2User.id,
      dayOfWeek: 0,
      allowedStart: '10:00',
      allowedEnd: '13:00',
      createdBy: parent1User.id,
    },
  ]);

  // ── 6. Content items (YouTube) ──────────────────────────────────────────────
  console.log('  Creating content items...');

  const insertedContent = await db
    .insert(schema.contentItems)
    .values(
      YOUTUBE_VIDEOS.map((v) => ({
        platform: 'youtube' as const,
        platformContentId: v.platformContentId,
        title: v.title,
        description: v.description,
        channelName: v.channelName,
        channelId: v.channelId,
        thumbnailUrl: v.thumbnailUrl,
        durationSeconds: v.durationSeconds,
        publishedAt: v.publishedAt,
        categoryId: v.categoryId,
        categoryLabel: v.categoryLabel,
        tags: v.tags,
        language: v.language,
        contentRating: v.contentRating,
        ageMinRecommended: v.ageMinRecommended,
        ageMaxRecommended: v.ageMaxRecommended,
        isLive: false,
        aiSafetyScore: v.aiSafetyScore,
        aiSafetyLabels: v.aiSafetyLabels,
      })),
    )
    .returning();

  // ── 7. Content filters ──────────────────────────────────────────────────────
  console.log('  Creating content filters...');

  await db.insert(schema.childContentFilters).values([
    {
      childId: child1User.id,
      filterType: 'block_category',
      filterValue: '22', // People & Blogs (YouTube category ID)
      createdBy: parent1User.id,
    },
    {
      childId: child1User.id,
      filterType: 'block_tag',
      filterValue: 'violence',
      createdBy: parent1User.id,
    },
    {
      childId: child2User.id,
      filterType: 'require_min_rating',
      filterValue: 'PG',
      createdBy: parent1User.id,
    },
    {
      childId: child3User.id,
      filterType: 'block_category',
      filterValue: '24', // Entertainment
      createdBy: parent2User.id,
    },
    {
      childId: child3User.id,
      filterType: 'block_tag',
      filterValue: 'gambling',
      createdBy: parent2User.id,
    },
  ]);

  // ── 8. Approved content ─────────────────────────────────────────────────────
  console.log('  Creating approved content...');

  const approvedItems: Array<{
    childId: string;
    contentId: string;
    approvedBy: string;
    expiresAt: Date;
    watchCount: number;
  }> = [];

  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Emma (preschool): approve Cocomelon, Numberblocks, Alphablocks, Blippi
  const emmaApproved = [0, 5, 7, 8]; // indices in insertedContent
  for (const idx of emmaApproved) {
    const item = insertedContent[idx];
    if (item) {
      approvedItems.push({
        childId: child1User.id,
        contentId: item.id,
        approvedBy: parent1User.id,
        expiresAt: thirtyDaysOut,
        watchCount: Math.floor(Math.random() * 8) + 1,
      });
    }
  }

  // Liam (early-school): approve Nat Geo, SciShow Kids, Dinosaur Train, Khan Academy, Art for Kids
  const liamApproved = [1, 3, 4, 6, 9];
  for (const idx of liamApproved) {
    const item = insertedContent[idx];
    if (item) {
      approvedItems.push({
        childId: child2User.id,
        contentId: item.id,
        approvedBy: parent1User.id,
        expiresAt: thirtyDaysOut,
        watchCount: Math.floor(Math.random() * 5) + 1,
      });
    }
  }

  // Aisha (tween): approve TED-Ed, Khan Academy, Art for Kids, SciShow Kids
  const aishaApproved = [2, 3, 6, 9];
  for (const idx of aishaApproved) {
    const item = insertedContent[idx];
    if (item) {
      approvedItems.push({
        childId: child3User.id,
        contentId: item.id,
        approvedBy: parent2User.id,
        expiresAt: thirtyDaysOut,
        watchCount: Math.floor(Math.random() * 10) + 1,
      });
    }
  }

  const insertedApproved = await db
    .insert(schema.approvedContent)
    .values(approvedItems)
    .returning();

  // ── 9. Watch sessions ───────────────────────────────────────────────────────
  console.log('  Creating watch sessions...');

  const watchSessionValues: Array<{
    childId: string;
    contentId: string;
    approvedContentId: string | null;
    startedAt: Date;
    endedAt: Date;
    watchSeconds: number;
    deviceType: string;
  }> = [];

  const oneDay = 24 * 60 * 60 * 1000;

  // Generate recent watch history for the last 7 days
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const sessionDate = new Date(now.getTime() - daysAgo * oneDay);

    // Emma watches Cocomelon daily
    const emmaCoco = insertedApproved.find(
      (a) => a.childId === child1User.id && insertedContent.find((c) => c.id === a.contentId && c.platformContentId === 'e_04ZrNroTo'),
    );
    if (emmaCoco) {
      const start = new Date(sessionDate);
      start.setHours(15, 30, 0, 0);
      const end = new Date(start.getTime() + 137 * 1000);
      watchSessionValues.push({
        childId: child1User.id,
        contentId: emmaCoco.contentId,
        approvedContentId: emmaCoco.id,
        startedAt: start,
        endedAt: end,
        watchSeconds: 137,
        deviceType: 'tablet',
      });
    }

    // Liam watches Nat Geo every other day
    if (daysAgo % 2 === 0) {
      const liamNatGeo = insertedApproved.find(
        (a) => a.childId === child2User.id && insertedContent.find((c) => c.id === a.contentId && c.platformContentId === 'RcNeh57i7zs'),
      );
      if (liamNatGeo) {
        const start = new Date(sessionDate);
        start.setHours(17, 0, 0, 0);
        const end = new Date(start.getTime() + 480 * 1000);
        watchSessionValues.push({
          childId: child2User.id,
          contentId: liamNatGeo.contentId,
          approvedContentId: liamNatGeo.id,
          startedAt: start,
          endedAt: end,
          watchSeconds: 480,
          deviceType: 'smart_tv',
        });
      }
    }

    // Aisha watches TED-Ed on weekdays
    const dayOfWeek = sessionDate.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const aishaTed = insertedApproved.find(
        (a) => a.childId === child3User.id && insertedContent.find((c) => c.id === a.contentId && c.platformContentId === 'MnP6TkRLQ3c'),
      );
      if (aishaTed) {
        const start = new Date(sessionDate);
        start.setHours(18, 0, 0, 0);
        const end = new Date(start.getTime() + 304 * 1000);
        watchSessionValues.push({
          childId: child3User.id,
          contentId: aishaTed.contentId,
          approvedContentId: aishaTed.id,
          startedAt: start,
          endedAt: end,
          watchSeconds: 304,
          deviceType: 'laptop',
        });
      }
    }
  }

  if (watchSessionValues.length > 0) {
    await db.insert(schema.watchSessions).values(watchSessionValues);
  }

  // ── 10. Content requests ────────────────────────────────────────────────────
  console.log('  Creating content requests...');

  // Liam requests TED-Ed (approved), Aisha requests Cocomelon (denied as too young)
  const tedEdItem = insertedContent.find((c) => c.platformContentId === 'MnP6TkRLQ3c');
  const cocomelonItem = insertedContent.find((c) => c.platformContentId === 'e_04ZrNroTo');
  const khanItem = insertedContent.find((c) => c.platformContentId === 'dCpSAGBjEQo');

  const requestValues = [];

  if (tedEdItem) {
    requestValues.push({
      childId: child2User.id,
      parentId: parent1User.id,
      contentId: tedEdItem.id,
      status: 'approved' as const,
      childNote: 'I want to learn about the sun for my science project',
      parentNote: 'Great educational content, approved!',
      requestedAt: new Date(now.getTime() - 3 * oneDay),
      decidedAt: new Date(now.getTime() - 3 * oneDay + 2 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 27 * oneDay),
      notifySent: true,
    });
  }

  if (cocomelonItem) {
    requestValues.push({
      childId: child3User.id,
      parentId: parent2User.id,
      contentId: cocomelonItem.id,
      status: 'denied' as const,
      childNote: 'My younger cousin showed me this',
      parentNote: 'This content is for much younger children. Try something age-appropriate.',
      requestedAt: new Date(now.getTime() - 1 * oneDay),
      decidedAt: new Date(now.getTime() - 1 * oneDay + 30 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 29 * oneDay),
      notifySent: true,
    });
  }

  if (khanItem) {
    requestValues.push({
      childId: child1User.id,
      parentId: parent1User.id,
      contentId: khanItem.id,
      status: 'pending' as const,
      childNote: 'Can I watch this math video for my homework?',
      parentNote: null,
      requestedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      decidedAt: null,
      expiresAt: new Date(now.getTime() + 2 * oneDay),
      notifySent: false,
    });
  }

  if (requestValues.length > 0) {
    await db.insert(schema.contentRequests).values(requestValues);
  }

  // ── 11. Recommendations ─────────────────────────────────────────────────────
  console.log('  Creating recommendations...');

  const recommendationValues = [];
  const sevenDaysOut = new Date(now.getTime() + 7 * oneDay);

  // Recommendations for Emma (preschool)
  const pbsKidsItem = insertedContent.find((c) => c.platformContentId === 'hl-cyaJxMGU');
  const alphablocksItem = insertedContent.find((c) => c.platformContentId === 'FXAnFp4EjuQ');

  if (pbsKidsItem) {
    recommendationValues.push({
      childId: child1User.id,
      contentId: pbsKidsItem.id,
      score: 0.92,
      reasonCode: 'community_similar_parents' as const,
      reasonLabel: 'Popular with parents in your community who have preschoolers',
      expiresAt: sevenDaysOut,
      shownToChild: false,
    });
  }

  if (alphablocksItem) {
    recommendationValues.push({
      childId: child1User.id,
      contentId: alphablocksItem.id,
      score: 0.88,
      reasonCode: 'trending_age_group' as const,
      reasonLabel: 'Trending with preschool-age children this week',
      expiresAt: sevenDaysOut,
      shownToChild: false,
    });
  }

  // Recommendations for Liam (early-school)
  const scishowItem = insertedContent.find((c) => c.platformContentId === 'jlNDzqcRoHI');
  const artItem = insertedContent.find((c) => c.platformContentId === 'GzL6KjApFrk');

  if (scishowItem) {
    recommendationValues.push({
      childId: child2User.id,
      contentId: scishowItem.id,
      score: 0.95,
      reasonCode: 'category_preference' as const,
      reasonLabel: 'Based on Liam\'s interest in science videos',
      expiresAt: sevenDaysOut,
      shownToChild: true,
    });
  }

  if (artItem) {
    recommendationValues.push({
      childId: child2User.id,
      contentId: artItem.id,
      score: 0.79,
      reasonCode: 'global_trending' as const,
      reasonLabel: 'Trending globally among school-age children',
      expiresAt: sevenDaysOut,
      shownToChild: false,
    });
  }

  // Recommendations for Aisha (tween)
  const khanItemForAisha = insertedContent.find((c) => c.platformContentId === 'dCpSAGBjEQo');
  const natGeoItem = insertedContent.find((c) => c.platformContentId === 'RcNeh57i7zs');

  if (khanItemForAisha) {
    recommendationValues.push({
      childId: child3User.id,
      contentId: khanItemForAisha.id,
      score: 0.91,
      reasonCode: 'community_similar_parents' as const,
      reasonLabel: 'Highly approved by parents with tweens in your region',
      expiresAt: sevenDaysOut,
      shownToChild: false,
    });
  }

  if (natGeoItem) {
    recommendationValues.push({
      childId: child3User.id,
      contentId: natGeoItem.id,
      score: 0.85,
      reasonCode: 'parent_channel_preference' as const,
      reasonLabel: 'From a channel your parent has approved before',
      expiresAt: sevenDaysOut,
      shownToChild: false,
    });
  }

  if (recommendationValues.length > 0) {
    await db.insert(schema.recommendations).values(recommendationValues);
  }

  // ── 12. Notifications ───────────────────────────────────────────────────────
  console.log('  Creating notifications...');

  await db.insert(schema.notifications).values([
    {
      userId: parent1User.id,
      type: 'content_request' as const,
      title: 'New content request from Emma',
      body: 'Emma wants to watch "Adding and Subtracting Fractions | Khan Academy"',
      dataJson: { childId: child1User.id, contentTitle: 'Adding and Subtracting Fractions | Khan Academy' },
      isRead: false,
      sentAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      userId: child2User.id,
      type: 'request_approved' as const,
      title: 'Your request was approved!',
      body: 'You can now watch "How Does the Sun Work? | TED-Ed"',
      dataJson: { contentTitle: 'How Does the Sun Work? | TED-Ed' },
      isRead: true,
      sentAt: new Date(now.getTime() - 3 * oneDay + 2 * 60 * 60 * 1000),
      readAt: new Date(now.getTime() - 3 * oneDay + 3 * 60 * 60 * 1000),
    },
    {
      userId: child3User.id,
      type: 'request_denied' as const,
      title: 'Your request was not approved',
      body: 'Your parent left a note: "This content is for much younger children. Try something age-appropriate."',
      dataJson: { contentTitle: 'Wheels On The Bus | CoComelon Nursery Rhymes & Kids Songs' },
      isRead: false,
      sentAt: new Date(now.getTime() - 1 * oneDay + 30 * 60 * 1000),
    },
    {
      userId: parent1User.id,
      type: 'screen_time_warning' as const,
      title: 'Screen time alert for Emma',
      body: 'Emma has used 45 of her 60 daily minutes of screen time.',
      dataJson: { childId: child1User.id, usedMinutes: 45, limitMinutes: 60 },
      isRead: false,
      sentAt: new Date(now.getTime() - 45 * 60 * 1000),
    },
    {
      userId: parent2User.id,
      type: 'weekly_summary' as const,
      title: 'Weekly screen time summary',
      body: "Aisha watched 3h 12m of content this week. Her most-watched category was Education.",
      dataJson: {
        childId: child3User.id,
        totalMinutes: 192,
        topCategory: 'Education',
        videoCount: 8,
      },
      isRead: true,
      sentAt: new Date(now.getTime() - 2 * oneDay),
      readAt: new Date(now.getTime() - 1 * oneDay),
    },
    {
      userId: child2User.id,
      type: 'new_recommendation' as const,
      title: 'New video recommended for you!',
      body: '"The Science of Rainbows | SciShow Kids" was recommended based on your interest in science.',
      dataJson: { contentTitle: 'The Science of Rainbows | SciShow Kids', reason: 'category_preference' },
      isRead: false,
      sentAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
  ]);

  // ── 13. Community content stats ─────────────────────────────────────────────
  console.log('  Creating community content stats...');

  const communityStatsValues = [];

  for (const item of insertedContent) {
    // Preschool stats
    if (item.ageMinRecommended <= 5) {
      communityStatsValues.push({
        contentId: item.id,
        ageGroup: 'preschool',
        religionBucket: null,
        incomeBucket: null,
        region: null,
        approvalCount: Math.floor(Math.random() * 200) + 50,
        denialCount: Math.floor(Math.random() * 10),
        watchCount: Math.floor(Math.random() * 1000) + 100,
        avgWatchPct: Math.random() * 0.4 + 0.6, // 60–100%
      });
    }

    // Early-school stats
    if (item.ageMinRecommended <= 10 && item.ageMaxRecommended >= 7) {
      communityStatsValues.push({
        contentId: item.id,
        ageGroup: 'early-school',
        religionBucket: null,
        incomeBucket: null,
        region: null,
        approvalCount: Math.floor(Math.random() * 300) + 80,
        denialCount: Math.floor(Math.random() * 15),
        watchCount: Math.floor(Math.random() * 1500) + 200,
        avgWatchPct: Math.random() * 0.35 + 0.6,
      });
    }

    // Tween stats
    if (item.ageMaxRecommended >= 10) {
      communityStatsValues.push({
        contentId: item.id,
        ageGroup: 'tween',
        religionBucket: null,
        incomeBucket: null,
        region: null,
        approvalCount: Math.floor(Math.random() * 250) + 60,
        denialCount: Math.floor(Math.random() * 20),
        watchCount: Math.floor(Math.random() * 1200) + 150,
        avgWatchPct: Math.random() * 0.4 + 0.55,
      });
    }
  }

  if (communityStatsValues.length > 0) {
    await db.insert(schema.communityContentStats).values(communityStatsValues);
  }

  // ── 14. Platform connections ────────────────────────────────────────────────
  console.log('  Creating platform connections...');

  await db.insert(schema.platformConnections).values([
    {
      parentId: parent1User.id,
      platform: 'youtube',
      accessToken: 'ya29.seed_access_token_sarah',
      refreshToken: '1//seed_refresh_token_sarah',
      tokenExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      platformUserId: 'UCseed_sarah_youtube_id',
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      isActive: true,
    },
    {
      parentId: parent2User.id,
      platform: 'youtube',
      accessToken: 'ya29.seed_access_token_david',
      refreshToken: '1//seed_refresh_token_david',
      tokenExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      platformUserId: 'UCseed_david_youtube_id',
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      isActive: true,
    },
  ]);

  // ── 15. Audit log ───────────────────────────────────────────────────────────
  console.log('  Creating audit log entries...');

  await db.insert(schema.auditLog).values([
    {
      actorId: parent1User.id,
      action: 'user.register',
      targetType: 'user',
      targetId: parent1User.id,
      metadata: { method: 'email' },
      ipAddress: '192.168.1.100',
      createdAt: parent1User.createdAt,
    },
    {
      actorId: parent2User.id,
      action: 'user.register',
      targetType: 'user',
      targetId: parent2User.id,
      metadata: { method: 'email' },
      ipAddress: '10.0.0.45',
      createdAt: parent2User.createdAt,
    },
    {
      actorId: parent1User.id,
      action: 'child.create',
      targetType: 'user',
      targetId: child1User.id,
      metadata: { displayName: 'Emma', ageGroup: 'preschool' },
      ipAddress: '192.168.1.100',
    },
    {
      actorId: parent1User.id,
      action: 'child.create',
      targetType: 'user',
      targetId: child2User.id,
      metadata: { displayName: 'Liam', ageGroup: 'early-school' },
      ipAddress: '192.168.1.100',
    },
    {
      actorId: parent2User.id,
      action: 'child.create',
      targetType: 'user',
      targetId: child3User.id,
      metadata: { displayName: 'Aisha', ageGroup: 'tween' },
      ipAddress: '10.0.0.45',
    },
    {
      actorId: parent1User.id,
      action: 'content.approve',
      targetType: 'content_item',
      targetId: insertedContent[0]?.id ?? null,
      metadata: { childId: child1User.id, contentTitle: YOUTUBE_VIDEOS[0]?.title },
      ipAddress: '192.168.1.100',
    },
    {
      actorId: parent2User.id,
      action: 'content_request.deny',
      targetType: 'content_request',
      targetId: null,
      metadata: {
        childId: child3User.id,
        contentTitle: YOUTUBE_VIDEOS[0]?.title,
        reason: 'Age-inappropriate content',
      },
      ipAddress: '10.0.0.45',
    },
  ]);

  console.log('Seed completed successfully.');
  console.log('');
  console.log('Summary:');
  console.log('  - 2 parent users (sarah.johnson@example.com, david.okafor@example.com)');
  console.log('  - 3 child users (Emma age 5, Liam age 9, Aisha age 11)');
  console.log(`  - ${insertedContent.length} YouTube content items`);
  console.log(`  - ${insertedApproved.length} approved content entries`);
  console.log(`  - ${watchSessionValues.length} watch sessions`);
  console.log(`  - ${communityStatsValues.length} community stat rows`);

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
