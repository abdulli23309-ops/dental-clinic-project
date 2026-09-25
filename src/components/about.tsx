export default function About() {
  return (
    <section id="about" className="border-t border-line bg-forest-deep text-bone">
      <div className="container-x grid grid-cols-1 gap-14 py-20 md:py-28 lg:grid-cols-12 lg:gap-16">
        {/* Portrait */}
        <div className="lg:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-forest">
            {/* Replace with a real portrait: natural light, no white coat, hands visible. */}
            <img
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=1200&auto=format&fit=crop"
              alt="Dr. Sarah Marlow"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-5 flex items-center justify-between text-[12px] uppercase tracking-[0.14em] text-bone/60">
            <span>Sarah Marlow, DDS</span>
            <span>Lincoln Park, IL</span>
          </div>
        </div>

        {/* Bio */}
        <div className="lg:col-span-7 lg:pl-4">
          <p className="eyebrow mb-5 text-clay">Meet your dentist</p>
          <h2 className="text-[34px] leading-[1.08] tracking-[-0.02em] text-bone sm:text-[44px]">
            I opened this practice
            <br />
            because I was tired of
            <br />
            watching patients get
            <br />
            rushed.
          </h2>

          <div className="mt-8 max-w-xl space-y-5 text-[15.5px] leading-[1.75] text-bone/80">
            <p>
              I spent my first four years after dental school at a group practice in
              the Loop. Twelve chairs, three hygienists, a different dentist every
              visit. Patients kept asking me the same thing: <em>&ldquo;Wait — are you
              the one who&rsquo;s doing the filling?&rdquo;</em> That bothered me.
            </p>
            <p>
              I opened Marlow Dental in 2014 with two chairs and a policy: one dentist,
              start to finish. I do every exam, every cleaning, every crown. If I
              refer you to a specialist, I call them myself and explain your case. If
              you ever feel rushed in my chair, tell the front desk and I&rsquo;ll
              hear about it that afternoon.
            </p>
            <p>
              Outside the office, I&rsquo;m a mediocre marathoner and a fairly good
              baker. You&rsquo;ll usually smell cookies in the waiting room on Friday
              mornings. That&rsquo;s not a marketing gimmick — I just like baking.
            </p>
          </div>

          {/* Credentials */}
          <dl className="mt-12 grid grid-cols-1 gap-x-10 gap-y-6 border-t border-bone/15 pt-8 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-bone/50">
                Education
              </dt>
              <dd className="mt-1.5 text-[14.5px] text-bone/90">
                DDS, University of Michigan
                <br />
                BS Biology, University of Illinois
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-bone/50">
                Licensure
              </dt>
              <dd className="mt-1.5 text-[14.5px] text-bone/90">
                Illinois Dental License #019.029811
                <br />
                DEA registered · CPR/BLS current
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-bone/50">
                Memberships
              </dt>
              <dd className="mt-1.5 text-[14.5px] text-bone/90">
                American Dental Association
                <br />
                Chicago Dental Society
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-bone/50">
                Continuing ed.
              </dt>
              <dd className="mt-1.5 text-[14.5px] text-bone/90">
                Spear Study Club (2016–present)
                <br />
                Invisalign certified provider
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}