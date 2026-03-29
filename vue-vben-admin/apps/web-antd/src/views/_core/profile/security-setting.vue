<script setup lang="ts">
import { computed } from 'vue';

import { ProfileSecuritySetting } from '@vben/common-ui';
import { $t } from '@vben/locales';

const formSchema = computed(() => {
  return [
    {
      value: true,
      fieldName: 'accountPassword',
      label: $t('profile.security.accountPassword.label'),
      description: $t('profile.security.accountPassword.description'),
    },
    {
      value: true,
      fieldName: 'securityPhone',
      label: $t('profile.security.securityPhone.label'),
      description: $t('profile.security.securityPhone.description'),
    },
    {
      value: true,
      fieldName: 'securityQuestion',
      label: $t('profile.security.securityQuestion.label'),
      description: $t('profile.security.securityQuestion.description'),
    },
    {
      value: true,
      fieldName: 'securityEmail',
      label: $t('profile.security.securityEmail.label'),
      description: $t('profile.security.securityEmail.description'),
    },
    {
      value: false,
      fieldName: 'securityMfa',
      label: $t('profile.security.securityMfa.label'),
      description: $t('profile.security.securityMfa.description'),
    },
  ];
});
</script>
<template>
  <ProfileSecuritySetting :form-schema="formSchema" />
</template>
