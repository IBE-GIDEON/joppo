import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const QA = [
  {
    q: 'What is Joppo?',
    a: 'A search engine for opportunities that never reach the big boards. Joppo reads company career pages, government tender portals, grant databases and partner pages directly, then links you to the original page so you apply at the source.',
  },
  {
    q: 'How is this different from LinkedIn or Indeed?',
    a: 'Those sites show you what was advertised to them, which means paid placements, reposts, and roles that already have hundreds of applicants. Joppo shows you what organisations published themselves, usually before it is syndicated anywhere, and always with a direct link.',
  },
  {
    q: 'What counts as a grant, partnership or investment listing?',
    a: 'Grants covers public funding calls, tenders and requests for proposals. Partnerships covers reseller, distributor, affiliate and channel openings that companies publish on their own partner pages. Investment covers accelerators, pitch competitions and open investor calls. Contracts covers freelance briefs and requests for quotation.',
  },
  {
    q: 'Why is there no free tier?',
    a: 'Running the crawlers costs money, and a free tier would mean deliberately showing you a worse product in order to sell you a better one. Instead the week pass is three dollars, which is less than the time you would lose on one bad application.',
  },
  {
    q: 'Which countries do you cover?',
    a: 'Every organisation we can reach that publishes in English, which today means heavy coverage of the United States, United Kingdom, European Union, and remote-first companies hiring globally. Remote is a first-class filter, not an afterthought.',
  },
  {
    q: 'Can I cancel?',
    a: 'Yes, at any time, and access runs to the end of the period you paid for. There is no auto-renew trap and no cancellation form to hunt for.',
  },
];

export function Faq() {
  return (
    <section id="faq" className="relative px-5 py-24 md:py-28">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="eyebrow">Questions</p>
          <h2 className="h-section mt-4">Answered plainly.</h2>
        </div>
        <Accordion type="single" collapsible className="mt-12">
          {QA.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
