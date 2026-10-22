<script setup lang="ts">
import { ref } from 'vue'

const openIndex = ref<number | null>(null)
const { track } = useUmami()

const faqs = [
  {
    id: 'distance',
    question: 'Wie wird die Entfernung berechnet?',
    answer: 'Als Luftlinie zwischen deinem Stammbezirk und der Bibliothek. Standard ist die PLZ 10178 (Berlin-Mitte). Du kannst deine eigene PLZ hinterlegen.'
  },
  {
    id: 'data-source',
    question: 'Woher stammen die Daten?',
    answer: 'Live von voebb.de. Da es keine offizielle API gibt, liest ein optimiertes Skript die Infos im Hintergrund aus.'
  },
  {
    id: 'data-storage',
    question: 'Wo werden meine Daten (PLZ-Stammbezirk) gespeichert?',
    answer: 'Deine Daten werden lokal im Browser (localstorage) gespeichert.'
  },
  {
    id: 'fewer-results',
    question: 'Warum finde ich weniger Treffer als beim VÖBB?',
    answer: 'BibBlitz lädt aus Performancegründen erstmal nur die erste Ergebnisseite. Mit „Weitere Treffer laden“ holst du dir bei Bedarf mehr.'
  },
  {
    id: 'app-store',
    question: 'Gibt es eine App für den App Store?',
    answer: 'Nein, aber du kannst BibBlitz im Browser über das „Teilen“-Menü einfach zum Startbildschirm hinzufügen. Es verhält sich dann genau wie eine native App.'
  }
]

const toggleFaq = (index: number) => {
  openIndex.value = openIndex.value === index ? null : index
  if (openIndex.value === index) {
    track('toggle-faq', { query: faqs[index]?.id ?? '' })
  }
}
</script>

<template>
  <section class="w-full font-sans">
    <h2 class="text-xl font-bold text-gray-900 mb-5">Häufige Fragen</h2>

    <div class="space-y-3">
      <div v-for="(faq, index) in faqs" :key="index"
        class="border border-gray-200 rounded-2xl bg-white overflow-hidden transition-all duration-200">
        <button @click="toggleFaq(index)" :id="`faq-button-${faq.id}`" :aria-expanded="openIndex === index"
          :aria-controls="`faq-panel-${faq.id}`"
          class="w-full flex items-center justify-between p-4 text-left select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600">
          <span class="text-sm font-semibold text-gray-900 pr-4">
            {{ faq.question }}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5"
            stroke="currentColor" class="w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0"
            :class="{ 'rotate-180 text-gray-900': openIndex === index }">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <div v-show="openIndex === index" :id="`faq-panel-${faq.id}`" role="region"
          :aria-labelledby="`faq-button-${faq.id}`" class="border-t border-gray-100 bg-gray-50/50">
          <p class="p-4 text-sm text-gray-700 leading-relaxed" v-html="faq.answer"></p>
        </div>
      </div>
    </div>
  </section>
</template>