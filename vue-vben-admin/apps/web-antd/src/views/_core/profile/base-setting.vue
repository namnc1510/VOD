<script setup lang="ts">
import type { BasicOption } from '@vben/types';

import type { VbenFormSchema } from '../../../adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { getUserInfoApi } from '../../../api';

const profileBaseSettingRef = ref();

const roleOptions = computed((): BasicOption[] => {
  return [
    {
      label: $t('profile.base.roleOptions.admin'),
      value: 'super',
    },
    {
      label: $t('profile.base.roleOptions.user'),
      value: 'user',
    },
    {
      label: $t('profile.base.roleOptions.test'),
      value: 'test',
    },
  ];
});

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'realName',
      component: 'Input',
      label: $t('profile.base.realName'),
    },
    {
      fieldName: 'username',
      component: 'Input',
      label: $t('profile.base.username'),
    },
    {
      fieldName: 'roles',
      component: 'Select',
      componentProps: {
        mode: 'tags',
        options: roleOptions.value,
      },
      label: $t('profile.base.roles'),
    },
    {
      fieldName: 'introduction',
      component: 'Textarea',
      label: $t('profile.base.introduction'),
    },
  ];
});

onMounted(async () => {
  const data = await getUserInfoApi();
  profileBaseSettingRef.value.getFormApi().setValues(data);
});
</script>
<template>
  <ProfileBaseSetting ref="profileBaseSettingRef" :form-schema="formSchema" />
</template>
