import { Nav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { Categories } from '@/components/landing/categories';
import { How } from '@/components/landing/how';
import { Testimonials } from '@/components/landing/testimonials';
import { Pricing } from '@/components/landing/pricing';
import { Faq } from '@/components/landing/faq';
import { ClosingCta, Footer } from '@/components/landing/footer';
import { prisma } from '@/lib/db';
import { CATEGORIES, type Category } from '@/lib/types';

export const revalidate = 300;

async function getCounts() {
  const empty = {
    total: 0,
    companies: 0,
    byCategory: {} as Partial<Record<Category, number>>,
  };

  try {
    const [total, companies, grouped] = await Promise.all([
      prisma.listing.count({ where: { active: true } }),
      prisma.company.count(),
      prisma.listing.groupBy({
        by: ['category'],
        where: { active: true },
        _count: { _all: true },
      }),
    ]);

    const byCategory: Partial<Record<Category, number>> = {};
    for (const row of grouped) {
      if ((CATEGORIES as readonly string[]).includes(row.category)) {
        byCategory[row.category as Category] = row._count._all;
      }
    }
    return { total, companies, byCategory };
  } catch {
    // The landing page must render even before the database exists.
    return empty;
  }
}

export default async function LandingPage() {
  const counts = await getCounts();

  return (
    <main className="relative">
      <Nav />
      <Hero counts={{ total: counts.total, companies: counts.companies }} />
      <Categories counts={counts.byCategory} />
      <How />
      <Testimonials />
      <Pricing />
      <Faq />
      <ClosingCta />
      <Footer />
    </main>
  );
}
