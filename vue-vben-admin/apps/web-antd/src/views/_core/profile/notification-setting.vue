<script setup lang="ts">
import { computed } from 'vue';

import { ProfileNotificationSetting } from '@vben/common-ui';
import { $t } from '@vben/locales';

const formSchema = computed(() => {
  return [
    {
      value: true,
      fieldName: 'accountPassword',
      label: $t('profile.notifications.accountPassword.label'),
      description: $t('profile.notifications.accountPassword.description'),
    },
    {
      value: true,
      fieldName: 'systemMessage',
      label: $t('profile.notifications.systemMessage.label'),
      description: $t('profile.notifications.systemMessage.description'),
    },
    {
      value: true,
      fieldName: 'todoTask',
      label: $t('profile.notifications.todoTask.label'),
      description: $t('profile.notifications.todoTask.description'),
    },
  ];
});
</script>
<template>
  <ProfileNotificationSetting :form-schema="formSchema" />
</template>
