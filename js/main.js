// ============================================
// NARINE MAGHAKYAN — PORTFOLIO — shared interactions
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  /* mobile nav toggle */
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if(toggle && links){
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.textContent = links.classList.contains('open') ? 'Close' : 'Menu';
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.textContent = 'Menu';
    }));
  }

  /* custom cursor (desktop only) */
  if(matchMedia('(hover:hover)').matches){
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    let rx=0, ry=0, mx=0, my=0;
    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx+'px'; dot.style.top = my+'px';
    });
    (function loop(){
      rx += (mx-rx)*0.15; ry += (my-ry)*0.15;
      ring.style.left = rx+'px'; ring.style.top = ry+'px';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, .cursor-hover').forEach(el=>{
      el.addEventListener('mouseenter', ()=>ring.classList.add('hover'));
      el.addEventListener('mouseleave', ()=>ring.classList.remove('hover'));
    });
  }

  /* grain overlay */
  const grain = document.createElement('div');
  grain.className = 'grain';
  document.body.appendChild(grain);

  /* scroll reveal */
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el=>io.observe(el));

  /* scroll progress bar */
  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  document.body.appendChild(bar);
  window.addEventListener('scroll', ()=>{
    const h = document.documentElement;
    const pct = (h.scrollTop)/(h.scrollHeight-h.clientHeight)*100;
    bar.style.width = pct+'%';
  });

  /* magnetic hover for project cards */
  document.querySelectorAll('.magnetic').forEach(card=>{
    card.addEventListener('mousemove', e=>{
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width/2) * 0.04;
      const y = (e.clientY - r.top - r.height/2) * 0.04;
      card.style.transform = `translate(${x}px, ${y}px)`;
    });
    card.addEventListener('mouseleave', ()=>{ card.style.transform = 'translate(0,0)'; });
  });

});
