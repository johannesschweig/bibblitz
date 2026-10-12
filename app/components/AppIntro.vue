<template>
  <div class="max-w-md mx-auto mt-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
    
    <div class="bg-slate-50 border-b border-slate-100 flex justify-center">
      <img 
        src="/search-borrow.png" 
        alt="BibBlitz Suche" 
        class="w-full object-cover object-top opacity-90"
      />
    </div>

    <div class="text-xl font-bold px-5 py-4">Suchen. Finden. Ausleihen.</div>

    <div class="px-5 pb-5 space-y-4">
      
      <div class="flex items-start gap-3">
        <div class="shrink-0 w-8 h-8 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-sm border border-amber-100">
          <Icon name="lucide:zap" class="size-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Sofort-Check</h3>
          <p class="text-xs text-slate-500 mt-0.5">Verfügbarkeit direkt in deiner Nähe sehen, ohne Extraklicks.</p>
        </div>
      </div>

      <div class="flex items-start gap-3">
        <div class="shrink-0 w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-sm border border-blue-100">
          <Icon name="lucide:clock" class="size-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Keine Zeitverschwendung</h3>
          <p class="text-xs text-slate-500 mt-0.5">Teilbare Links. Kein nerviges Session-Ende.</p>
        </div>
      </div>

      <div class="flex items-start gap-3">
        <div class="shrink-0 w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-sm border border-emerald-100">
          <Icon name="lucide:smartphone" class="size-4" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900 leading-tight">Fürs Handy gemacht</h3>
          <p class="text-xs text-slate-500 mt-0.5">Klares Layout für die direkte Nutzung am Regal.</p>
        </div>
      </div>

    </div>
    
  </div>
</template>