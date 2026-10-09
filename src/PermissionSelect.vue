<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type Value = string | number
type Option = { value: Value; label: string; group?: string }
const props = withDefaults(defineProps<{
  modelValue: Value[] | Value | null
  options: Option[]
  multiple?: boolean
  clearable?: boolean
  disabled?: boolean
  label: string
  placement?: 'down' | 'up'
  maxTag?: number
  dialog?: boolean
}>(), { multiple: false, clearable: false, disabled: false, placement: 'down', maxTag: 1, dialog: false })
const emit = defineEmits<{ 'update:modelValue': [value: Value[] | Value | null] }>()
const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const open = ref(false)
const search = ref('')
const activeGroup = ref<string>('')
const tempSelected = ref<Value[]>([])
const popStyle = ref<Record<string, string>>({})
const selected = computed(() => Array.isArray(props.modelValue) ? props.modelValue : props.modelValue === null ? [] : [props.modelValue])
const selectedOptions = computed(() => props.options.filter(option => selected.value.includes(option.value)))
const visibleTags = computed(() => selectedOptions.value.slice(0, props.maxTag))
const collapsedCount = computed(() => Math.max(0, selectedOptions.value.length - props.maxTag))
const selectedOptionsLabel = computed(() => selectedOptions.value.map(option => option.label).join('、'))
const grouped = computed(() => props.options.some(o => o.group))
const groupNames = computed(() => {
  if (!grouped.value) return []
  const seen: string[] = []
  for (const o of props.options) { const g = o.group || '其他'; if (!seen.includes(g)) seen.push(g) }
  return seen
})
const filtered = computed(() => {
  const kw = search.value.toLowerCase()
  return props.options.filter(option => {
    if (kw && !option.label.toLowerCase().includes(kw)) return false
    if (grouped.value && activeGroup.value && (option.group || '其他') !== activeGroup.value) return false
    return true
  })
})

async function positionPop() {
  await nextTick()
  if (!root.value) return
  const rect = root.value.getBoundingClientRect()
  if (props.placement === 'up') popStyle.value = { position: 'fixed', left: rect.left + 'px', width: rect.width + 'px', bottom: (window.innerHeight - rect.top + 4) + 'px', top: 'auto' }
  else popStyle.value = { position: 'fixed', left: rect.left + 'px', width: rect.width + 'px', top: (rect.bottom + 4) + 'px', bottom: 'auto' }
}

function openPicker() {
  if (props.disabled) return
  tempSelected.value = [...selected.value]
  search.value = ''
  if (grouped.value && !activeGroup.value) activeGroup.value = groupNames.value[0] || ''
  open.value = true
  if (!props.dialog) { void positionPop(); searchInput.value?.focus() }
}
function closePicker() { open.value = false; search.value = '' }
function confirm() { emit('update:modelValue', tempSelected.value); closePicker() }
function toggleOption(v: Value) {
  if (tempSelected.value.includes(v)) tempSelected.value = tempSelected.value.filter(i => i !== v)
  else tempSelected.value = [...tempSelected.value, v]
}
function chooseSmall(v: Value) {
  if (props.multiple) { toggleOption(v); emit('update:modelValue', tempSelected.value); search.value = ''; searchInput.value?.focus() }
  else { emit('update:modelValue', v); closePicker() }
}
function remove(v: Value) { if (!props.disabled) emit('update:modelValue', selected.value.filter(i => i !== v)) }
function clearAll() { if (!props.disabled) emit('update:modelValue', []) }
const pickerMask = ref<HTMLElement | null>(null)
function outside(e: PointerEvent) {
  if (root.value?.contains(e.target as Node)) return
  if (props.dialog && pickerMask.value && pickerMask.value.contains(e.target as Node)) return
  closePicker()
}
function onReposition() { if (open.value && !props.dialog) void positionPop() }
watch(open, v => { if (v && !props.dialog) void positionPop() })
onMounted(() => { document.addEventListener('pointerdown', outside); window.addEventListener('resize', onReposition); window.addEventListener('scroll', onReposition, true) })
onBeforeUnmount(() => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', onReposition); window.removeEventListener('scroll', onReposition, true) })
</script>

<template>
  <div ref="root" class="permission-select" :class="{ 'is-disabled': disabled, 'is-open': open }">
    <div class="permission-control" :title="multiple && selectedOptions.length ? selectedOptionsLabel : undefined" @click="openPicker">
      <template v-if="multiple">
        <span v-for="option in visibleTags" :key="option.value" class="selected-tag">
          {{ option.label }}<button v-if="!disabled" type="button" @click.stop="remove(option.value)">×</button>
        </span>
        <span v-if="collapsedCount" class="selected-tag selected-more">+{{ collapsedCount }}</span>
        <span v-if="!selected.length" class="single-value placeholder">请选择</span>
      </template>
      <span v-else-if="selectedOptions.length" class="single-value">{{ selectedOptions[0].label }}</span>
      <span v-else class="single-value placeholder">请选择</span>
      <button v-if="clearable && selected.length && !disabled" class="select-clear" type="button" @click.stop="clearAll">×</button>
      <span class="select-chevron" aria-hidden="true"></span>
    </div>

    <!-- 小下拉面板（dialog=false） -->
    <div v-if="open && !disabled && !dialog" class="select-pop" :style="popStyle" role="listbox">
      <div v-if="grouped" class="pop-tabs">
        <button v-for="g in groupNames" :key="g" type="button" :class="{ active: activeGroup === g }" @click="activeGroup = g">{{ g }}</button>
      </div>
      <button v-for="option in filtered" :key="option.value" type="button" class="pop-item" :class="{ selected: multiple ? tempSelected.includes(option.value) : selected[0] === option.value }" @mousedown.prevent @click="chooseSmall(option.value)">
        {{ option.label }}<span v-if="multiple ? tempSelected.includes(option.value) : selected[0] === option.value">✓</span>
      </button>
      <div v-if="!filtered.length" class="pop-empty">暂无数据</div>
      <div v-if="multiple && selected.length" class="pop-footer">
        <span>已选 {{ selected.length }} 项</span>
        <button type="button" @mousedown.prevent @click="clearAll">清空</button>
      </div>
    </div>

    <!-- 弹窗（dialog=true） -->
    <Teleport to="body">
      <div ref="pickerMask" v-if="open && dialog" class="picker-mask" @click.self="closePicker">
        <div class="picker-dialog" role="dialog">
          <div class="picker-header">
            <span class="picker-title">{{ label }}（已选 {{ tempSelected.length }} 项）</span>
            <button type="button" class="picker-close" @click="closePicker">×</button>
          </div>
          <div v-if="grouped" class="picker-tabs">
            <button v-for="g in groupNames" :key="g" type="button" :class="{ active: activeGroup === g }" @click="activeGroup = g">{{ g }}</button>
          </div>
          <div class="picker-search"><input v-model="search" placeholder="搜索…" autocomplete="off"></div>
          <div class="picker-list">
            <label v-for="option in filtered" :key="option.value" class="picker-item" :class="{ checked: multiple ? tempSelected.includes(option.value) : selected[0] === option.value }" @click="multiple ? null : chooseSmall(option.value)">
              <input v-if="multiple" type="checkbox" :checked="tempSelected.includes(option.value)" @change="toggleOption(option.value)">
              <input v-else type="radio" :checked="selected[0] === option.value" @change="chooseSmall(option.value)">
              <span>{{ option.label }}</span>
            </label>
            <div v-if="!filtered.length" class="picker-empty">暂无数据</div>
          </div>
          <div v-if="multiple" class="picker-footer">
            <button type="button" class="picker-btn" @click="closePicker">取消</button>
            <button type="button" class="picker-btn primary" @click="confirm">确定</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.permission-control {
  display: flex; align-items: center; gap: 4px;
  min-height: 30px; padding: 2px 8px;
  border: 1px solid #d5d9e0; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 13px;
}
.permission-control:hover { border-color: #1677ff; }
.is-disabled .permission-control { background: #f5f5f5; cursor: not-allowed; }
.single-value { flex: 1; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.single-value.placeholder { color: #9ca3af; }
.select-chevron { position: absolute; top: 50%; right: 11px; width: 0; height: 0; flex-shrink: 0; border: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #9ca3af; transform: translateY(-50%); pointer-events: none; }
.is-open .select-chevron { border-top: 0; border-bottom: 5px solid #9ca3af; }
.select-clear { border: 0; background: transparent; color: #9ca3af; cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px; }
.selected-tag { display: inline-flex; align-items: center; gap: 2px; max-width: 120px; padding: 0 6px; height: 20px; font-size: 12px; line-height: 18px; background: #f0f5ff; color: #1d39c4; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.selected-tag button { border: 0; background: transparent; color: #1d39c4; cursor: pointer; padding: 0 2px; font-size: 12px; line-height: 1; }
.selected-more { background: #e6f4ff; color: #1677ff; max-width: none; }

.select-pop { position: fixed; z-index: 2000; background: #fff; border: 1px solid #e8e8e8; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,.12); max-height: 260px; overflow: auto; padding: 4px; }
.pop-tabs { display: flex; border-bottom: 1px solid #f0f0f0; margin: -4px -4px 4px; position: sticky; top: 0; background: #fff; z-index: 2; }
.pop-tabs button { flex: 1; padding: 6px; border: 0; background: transparent; font-size: 12px; color: #595959; cursor: pointer; border-bottom: 2px solid transparent; }
.pop-tabs button.active { color: #1677ff; font-weight: 600; border-bottom-color: #1677ff; }
.pop-search { padding: 4px; }
.pop-search input { width: 100%; height: 28px; padding: 0 8px; border: 1px solid #d5d9e0; border-radius: 4px; font-size: 13px; box-sizing: border-box; }
.pop-search input:focus { outline: none; border-color: #1677ff; }
.pop-item { display: flex; justify-content: space-between; width: 100%; text-align: left; padding: 7px 10px; border: 0; background: #fff; font-size: 13px; cursor: pointer; border-radius: 3px; }
.pop-item:hover { background: #f5f5ff; }
.pop-item.selected { color: #1677ff; }
.pop-empty { padding: 16px; text-align: center; color: #9ca3af; font-size: 12px; }
.pop-footer { position: sticky; bottom: 0; display: flex; justify-content: space-between; padding: 6px 10px; background: #fafafa; border-top: 1px solid #f0f0f0; font-size: 12px; color: #8c8c8c; }
.pop-footer button { border: 0; background: transparent; color: #1677ff; cursor: pointer; font-size: 12px; }

.picker-mask { position: fixed; inset: 0; z-index: 3000; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; }
.picker-dialog { width: 420px; max-width: 90vw; max-height: 80vh; background: #fff; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,.2); }
.picker-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
.picker-title { font-size: 14px; font-weight: 600; color: #111827; }
.picker-close { border: 0; background: transparent; font-size: 20px; color: #9ca3af; cursor: pointer; line-height: 1; }
.picker-close:hover { color: #111827; }
.picker-tabs { display: flex; border-bottom: 1px solid #f0f0f0; background: #fafafa; }
.picker-tabs button { flex: 1; padding: 8px; border: 0; background: transparent; font-size: 13px; color: #595959; cursor: pointer; border-bottom: 2px solid transparent; }
.picker-tabs button.active { color: #1677ff; font-weight: 600; border-bottom-color: #1677ff; background: #fff; }
.picker-search { padding: 8px 16px; border-bottom: 1px solid #f0f0f0; }
.picker-search input { width: 100%; height: 30px; padding: 0 8px; border: 1px solid #d5d9e0; border-radius: 4px; font-size: 13px; box-sizing: border-box; }
.picker-search input:focus { outline: none; border-color: #1677ff; }
.picker-list { flex: 1; overflow: auto; padding: 4px 0; }
.picker-item { display: flex; align-items: center; gap: 8px; padding: 8px 16px; cursor: pointer; font-size: 13px; }
.picker-item:hover { background: #f5f5ff; }
.picker-item.checked { background: #f0f5ff; color: #1d39c4; }
.picker-item input { margin: 0; }
.picker-empty { padding: 24px; text-align: center; color: #9ca3af; font-size: 13px; }
.picker-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 16px; border-top: 1px solid #f0f0f0; }
.picker-btn { padding: 6px 16px; border: 1px solid #d5d9e0; border-radius: 4px; background: #fff; font-size: 13px; cursor: pointer; color: #374151; }
.picker-btn:hover { border-color: #1677ff; color: #1677ff; }
.picker-btn.primary { background: #1677ff; border-color: #1677ff; color: #fff; }
.picker-btn.primary:hover { background: #4096ff; }
</style>
