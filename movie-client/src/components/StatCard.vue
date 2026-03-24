<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  hint: {
    type: String,
    default: ''
  }
});
</script>

<template>
  <article class="stat-card">
    <p class="stat-title">{{ title }}</p>
    <h3 class="stat-value">{{ value }}</h3>
    <p v-if="hint" class="stat-hint">{{ hint }}</p>
  </article>
</template>

