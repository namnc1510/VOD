<script setup lang="ts">
import type { VbenFormSchema } from '../../../adapter/form';

import { computed } from 'vue';

import { ProfilePasswordSetting, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from 'ant-design-vue';

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'oldPassword',
      label: $t('profile.password.oldPasswordLabel'),
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('profile.password.oldPasswordPlaceholder'),
      },
    },
    {
      fieldName: 'newPassword',
      label: $t('profile.password.newPasswordLabel'),
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: $t('profile.password.newPasswordPlaceholder'),
      },
    },
    {
      fieldName: 'confirmPassword',
      label: $t('profile.password.confirmPasswordLabel'),
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: $t('profile.password.confirmPasswordPlaceholder'),
      },
      dependencies: {
        rules(values) {
          const { newPassword } = values;
          return z
            .string({
              required_error: $t('profile.password.confirmPasswordRequired'),
            })
            .min(1, { message: $t('profile.password.confirmPasswordRequired') })
            .refine((value) => value === newPassword, {
              message: $t('profile.password.mismatch'),
            });
        },
        triggerFields: ['newPassword'],
      },
    },
  ];
});

function handleSubmit() {
  message.success($t('profile.password.success'));
}
</script>
<template>
  <ProfilePasswordSetting
    class="w-1/3"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
