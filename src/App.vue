<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import PermissionSelect from './PermissionSelect.vue'

type UserType = 'INTERNAL_EMPLOYEE' | 'EXTERNAL_COLLABORATOR' | 'INTERNAL_EMPLOYEE_TEMPORARY_SUB_ACCOUNT'
type DrawerMode = 'add' | 'edit' | 'view'

type UserRow = {
  accountId: number
  username: string
  nickName: string
  userType: UserType | ''
  roleName: string[]
  fsDepartmentId?: string | number
  createTime?: string
  deleted?: boolean
  jobNumber?: string
}

type DeptNode = { deptId: string | number; deptName: string; children?: DeptNode[] }
type RoleOption = { id: number; roleName: string; saleAreaFlag?: boolean; flag?: boolean | number }
type DataPermOption = { id: number; name: string }
type HrEmployee = { empNo: string; name: string; mobile?: string; enterpriseEmail?: string; deptId?: string; startDate?: string }
type DictionaryDetail = { id?: number; dictionaryTermName?: string; dictionaryTermValue?: string | number }
type DictionaryGroup = { dictionaryCode: string | number; dictionaryDetailList?: DictionaryDetail[] }

type BridgeEnvelope = { __bridge: string; id: number; ok: boolean; status: number; data?: any; error?: string }
const bridgePending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
let bridgeSeq = 0
window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as BridgeEnvelope | undefined
  if (!data || data.__bridge !== 'lecang-prototype:res') return
  const p = bridgePending.get(data.id)
  if (!p) return
  bridgePending.delete(data.id)
  if (data.ok) p.resolve(data.data)
  else p.reject(new Error(data.error || `HTTP ${data.status}`))
})

function apiRequest<T = any>(method: 'GET' | 'POST', path: string, opts: { query?: Record<string, string>; body?: unknown } = {}): Promise<T> {
  const id = ++bridgeSeq
  return new Promise((resolve, reject) => {
    bridgePending.set(id, { resolve, reject })
    window.parent.postMessage({ __bridge: 'lecang-prototype:req', id, method, path, query: opts.query, body: opts.body }, '*')
    window.setTimeout(() => {
      if (bridgePending.has(id)) { bridgePending.delete(id); reject(new Error('请求超时')) }
    }, 30000)
  })
}

const embedded = ref(window.self !== window.top)
const bridgeError = ref('')

const userTypeLabels: Record<string, string> = {
  INTERNAL_EMPLOYEE: '内部员工',
  EXTERNAL_COLLABORATOR: '外部协作人员',
  INTERNAL_EMPLOYEE_TEMPORARY_SUB_ACCOUNT: '内部员工（临时子账号）',
}
const zoneOptions = [
  { value: 'Asia/Shanghai', label: '(GMT+08:00) 中国标准时间' },
  { value: 'America/Los_Angeles', label: '(GMT-08:00) 太平洋时间' },
  { value: 'America/Chicago', label: '(GMT-06:00) 美国中部时间' },
  { value: 'America/New_York', label: '(GMT-05:00) 美国东部时间' },
  { value: 'Europe/London', label: '(GMT+00:00) 格林尼治标准时间' },
]

const roles = ref<RoleOption[]>([])
const dataPerms = ref<DataPermOption[]>([])
const newDataPermGroups = ref<DataPermOption[]>([])
const deptTree = ref<DeptNode[]>([])
const warehouseCodes = ref<string[]>([])
const areaOptions = ref<{ value: number; label: string }[]>([])
const areaLoading = ref(false)
const areaLoadError = ref('')
const employeeOptions = ref<HrEmployee[]>([])

const rows = ref<UserRow[]>([])
const total = ref(0)
const loading = ref(false)
const filters = reactive({ username: '', nickName: '', jobNumber: '', userType: '', roleName: '', deleted: '' })
const page = ref(1)
const pageSize = ref(20)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

function deptPathName(deptId?: string | number): string {
  if (deptId === undefined || deptId === null || deptId === '') return ''
  const find = (tree: DeptNode[], target: string | number, trail: string[]): string[] | null => {
    for (const node of tree) {
      const next = [...trail, node.deptName]
      if (String(node.deptId) === String(target)) return next
      if (node.children?.length) {
        const r = find(node.children, target, next)
        if (r) return r
      }
    }
    return null
  }
  return find(deptTree.value, deptId, [])?.join(' / ') || ''
}

async function loadList() {
  loading.value = true
  bridgeError.value = ''
  try {
    const body: Record<string, unknown> = { pageNum: page.value, pageSize: pageSize.value }
    if (filters.username) body.username = filters.username
    if (filters.nickName) body.nickName = filters.nickName
    if (filters.jobNumber) body.jobNumber = filters.jobNumber
    if (filters.userType) body.userType = filters.userType
    if (filters.roleName) body.roleName = filters.roleName
    if (filters.deleted !== '') body.deleted = Number(filters.deleted)
    const res = await apiRequest<{ code: number; data: { list: UserRow[]; total: number }; message?: string }>('POST', '/system/user/unperm/getListsByPage', { body })
    if (res.code !== 200) throw new Error(res.message || `错误码 ${res.code}`)
    rows.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e: any) {
    bridgeError.value = `列表加载失败：${e.message}`
  } finally {
    loading.value = false
  }
}

function query() { page.value = 1; loadList() }
function resetFilters() { Object.assign(filters, { username: '', nickName: '', jobNumber: '', userType: '', roleName: '', deleted: '' }); page.value = 1; loadList() }

watch(page, () => loadList())
watch(pageSize, () => { page.value = 1; loadList() })

const drawerOpen = ref(false)
const drawerMode = ref<DrawerMode>('add')
const currentRow = ref<UserRow | null>(null)
const recreate = ref(true)
const message = ref('')
const formError = ref('')

type FormState = {
  username: string; password: string; confirmPassword: string; enabled: boolean
  userType: UserType | ''; employee: string; empNo: string; name: string; phone: string; email: string
  fsDepartmentId: string; zoneCode: string; employment: string
  roleIds: number[]; dataPermissionIds: number[]; groupId: number | null
  saleAreaCodes: number[]; warehouseList: string[]
}
const blankForm = (): FormState => ({
  username: '', password: '', confirmPassword: '', enabled: true,
  userType: '', employee: '', empNo: '', name: '', phone: '', email: '',
  fsDepartmentId: '', zoneCode: 'Asia/Shanghai', employment: '',
  roleIds: [], dataPermissionIds: [], groupId: null, saleAreaCodes: [], warehouseList: [],
})
const form = reactive<FormState>(blankForm())

const isView = computed(() => drawerMode.value === 'view')
const isInternal = computed(() => form.userType === 'INTERNAL_EMPLOYEE' || form.userType === 'INTERNAL_EMPLOYEE_TEMPORARY_SUB_ACCOUNT')
const selectedRoles = computed(() => roles.value.filter(r => form.roleIds.includes(r.id)))
const showAreas = computed(() => selectedRoles.value.some(r => r.saleAreaFlag))
const showWarehouses = computed(() => selectedRoles.value.some(r => r.flag))

watch(() => form.roleIds, () => {
  if (!showAreas.value) form.saleAreaCodes = []
  if (!showWarehouses.value) form.warehouseList = []
}, { deep: true })

// ---------- 复制权限：从已有用户复制角色/数据权限/区域/仓库 ----------
const copyKeyword = ref('')
const copyResults = ref<UserRow[]>([])
const copySearching = ref(false)
const copyPanelOpen = ref(false)
const copySearchRoot = ref<HTMLElement | null>(null)
const copiedFromUser = ref('')
const selectedCopyUser = ref<UserRow | null>(null)
let copySearchTimer = 0
let copySearchSeq = 0

function formatCopyUser(row: UserRow) {
  return row.nickName ? `${row.username}（${row.nickName}）` : row.username
}

async function searchCopyUsers() {
  const requestSeq = ++copySearchSeq
  const keyword = selectedCopyUser.value && copyKeyword.value === formatCopyUser(selectedCopyUser.value)
    ? selectedCopyUser.value.username
    : copyKeyword.value.trim()
  if (!keyword) {
    copyResults.value = []
    copySearching.value = false
    copyPanelOpen.value = false
    return
  }
  copySearching.value = true
  copyPanelOpen.value = true
  try {
    const request = (filters: Record<string, string>) => apiRequest<{ code: number; data: { list: UserRow[] } }>('POST', '/system/user/unperm/getListsByPage', { body: { pageNum: 1, pageSize: 8, ...filters } })
    const responses = await Promise.all([request({ username: keyword }), request({ nickName: keyword }), request({ jobNumber: keyword })])
    if (requestSeq !== copySearchSeq) return
    const merged = new Map<number, UserRow>()
    for (const response of responses) {
      if (response.code === 200) for (const user of response.data?.list || []) merged.set(user.accountId, user)
    }
    copyResults.value = [...merged.values()].slice(0, 8)
  } catch {
    if (requestSeq === copySearchSeq) copyResults.value = []
  } finally {
    if (requestSeq === copySearchSeq) copySearching.value = false
  }
}

function scheduleCopySearch() {
  window.clearTimeout(copySearchTimer)
  copySearchTimer = window.setTimeout(searchCopyUsers, 250)
}

function onCopyKeywordInput() {
  if (selectedCopyUser.value && copyKeyword.value !== formatCopyUser(selectedCopyUser.value)) {
    selectedCopyUser.value = null
    copiedFromUser.value = ''
  }
  scheduleCopySearch()
}

function toggleCopyPanel() {
  if (copyPanelOpen.value) {
    copyPanelOpen.value = false
    return
  }
  void searchCopyUsers()
}

function closeCopyPanelOnOutside(e: PointerEvent) {
  if (!copySearchRoot.value?.contains(e.target as Node)) copyPanelOpen.value = false
}

async function applyCopyUser(row: UserRow) {
  try {
    const res = await apiRequest<{ code: number; data: any }>('GET', '/system/user/unperm/getUserByAccountId', { query: { accountId: String(row.accountId) } })
    if (res.code !== 200) throw new Error('加载失败')
    const d = res.data
    form.roleIds = (d.roleList || []).map((r: any) => r.id)
    form.dataPermissionIds = d.dataPermissionIds || []
    form.groupId = d.groupId ?? null
    form.saleAreaCodes = (d.saleAreaCodes || []).map((code: string | number) => Number(code)).filter(Number.isFinite)
    form.warehouseList = d.user?.warehouseCodes ? String(d.user.warehouseCodes).split(',').filter(Boolean) : []
    selectedCopyUser.value = row
    copiedFromUser.value = formatCopyUser(row)
    copyKeyword.value = formatCopyUser(row)
    copyPanelOpen.value = false
  } catch (e: any) { formError.value = '复制权限失败：' + e.message }
}

function selectCopyUser(row: UserRow) {
  selectedCopyUser.value = row
  copiedFromUser.value = formatCopyUser(row)
  copyKeyword.value = formatCopyUser(row)
  copyPanelOpen.value = false
  void applyCopyUser(row)
}

function reapplyCopyUser() {
  if (selectedCopyUser.value) void applyCopyUser(selectedCopyUser.value)
}

function clearSelectedCopyUser() {
  window.clearTimeout(copySearchTimer)
  copySearchSeq += 1
  copyKeyword.value = ''
  copyResults.value = []
  copySearching.value = false
  copyPanelOpen.value = false
  copiedFromUser.value = ''
  selectedCopyUser.value = null
}

function notify(text: string) { message.value = text; window.setTimeout(() => { if (message.value === text) message.value = '' }, 1800) }
function closeDrawer() { drawerOpen.value = false; formError.value = '' }

function flattenDepts(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  const walk = (nodes: DeptNode[], prefix: string) => {
    for (const n of nodes) {
      const label = prefix ? `${prefix} / ${n.deptName}` : n.deptName
      out.push({ value: String(n.deptId), label })
      if (n.children?.length) walk(n.children, label)
    }
  }
  walk(deptTree.value, '')
  return out
}
const flatDeptOptions = computed(flattenDepts)

async function openForm(row: UserRow | null, mode: DrawerMode) {
  drawerMode.value = mode
  currentRow.value = row
  formError.value = ''
  copyKeyword.value = ''
  copyResults.value = []
  copiedFromUser.value = ''
  selectedCopyUser.value = null
  copyPanelOpen.value = false
  Object.assign(form, blankForm())
  drawerOpen.value = true
  if (!row) return
  try {
    const res = await apiRequest<{ code: number; data: any; message?: string }>('GET', '/system/user/unperm/getUserByAccountId', { query: { accountId: String(row.accountId) } })
    if (res.code !== 200) throw new Error(res.message || `错误码 ${res.code}`)
    const d = res.data
    const account = d.account || {}
    const user = d.user || {}
    const roleIds: number[] = (d.roleList || []).map((r: any) => r.id)
    Object.assign(form, {
      username: account.username || row.username,
      password: '', confirmPassword: '',
      enabled: !user.deleted,
      userType: user.userType || row.userType || '',
      employee: user.employee || '',
      empNo: user.jobNumber || row.jobNumber || '',
      name: user.nickName || row.nickName || '',
      phone: user.tel || '', email: user.email || '',
      fsDepartmentId: user.fsDepartmentId != null ? String(user.fsDepartmentId) : '',
      zoneCode: account.zoneCode || user.zoneCode || 'Asia/Shanghai',
      employment: user.employment || '',
      roleIds,
      dataPermissionIds: d.dataPermissionIds || [],
      groupId: d.groupId ?? null,
      saleAreaCodes: (d.saleAreaCodes || []).map((code: string | number) => Number(code)).filter(Number.isFinite),
      warehouseList: user.warehouseCodes ? String(user.warehouseCodes).split(',').filter(Boolean) : [],
    })
  } catch (e: any) {
    formError.value = `详情加载失败：${e.message}`
  }
}

function changeUserType() {
  if (form.userType === 'EXTERNAL_COLLABORATOR') { form.employee = ''; form.empNo = ''; form.employment = '' }
  else if (form.userType === 'INTERNAL_EMPLOYEE') form.empNo = ''
}

async function searchEmployees(keyword: string) {
  if (!keyword) { employeeOptions.value = []; return }
  try {
    const res = await apiRequest<{ code: number; data: { data: { records: HrEmployee[] } } }>('POST', '/system/user/getHrEmployeeList', {
      body: { page: { current: 1, size: 100 }, employmentStatus: 'ACTIVE', employeeName: keyword },
    })
    if (res.code === 200) employeeOptions.value = res.data?.data?.records || []
  } catch { employeeOptions.value = [] }
}

function pickEmployee(empNo: string) {
  const item = employeeOptions.value.find(e => e.empNo === empNo)
  if (!item) return
  form.empNo = item.empNo
  form.name = item.name
  form.phone = item.mobile || ''
  form.email = item.enterpriseEmail || ''
  form.fsDepartmentId = item.deptId != null ? String(item.deptId) : ''
  form.employment = (item.startDate || '').slice(0, 10)
}

function onEmployeeInput() { searchEmployees(form.employee) }
function onEmployeeBlur() {
  const hit = employeeOptions.value.find(e => e.name === form.employee)
  if (hit) pickEmployee(hit.empNo)
}

function save() {
  formError.value = ''
  notify('原型暂不支持保存')
}

async function toggle(row: UserRow) {
  const action = row.deleted ? '启用' : '禁用'
  if (!window.confirm(`确认${action}用户"${row.username}"？`)) return
  try {
    const res = await apiRequest<{ code: number; message?: string }>('POST', '/system/user/disableUser', { body: { accountId: row.accountId, deleted: !row.deleted } })
    if (res.code !== 200) throw new Error(res.message || `错误码 ${res.code}`)
    await loadList()
  } catch (e: any) {
    bridgeError.value = `操作失败：${e.message}`
  }
}

const roleSelectOptions = computed(() => roles.value.map(r => {
  const bindingHints: string[] = []
  if (r.saleAreaFlag) bindingHints.push('需绑定区域')
  return {
    value: r.id,
    label: r.roleName,
    hint: bindingHints.join(' · ') || undefined,
    group: r.flag === undefined ? undefined : (Number(r.flag) === 1 ? 'WMS 仓库角色' : 'GDAWS 系统角色'),
  }
}))
const dataSelectOptions = computed(() => dataPerms.value.map(d => ({ value: d.id, label: d.name })))
const groupSelectOptions = computed(() => newDataPermGroups.value.map(g => ({ value: g.id, label: g.name })))
const warehouseSelectOptions = computed(() => Array.from(new Set([...warehouseCodes.value, ...form.warehouseList])).map(w => ({ value: w, label: w })))

async function loadAreaOptions() {
  areaLoading.value = true
  areaLoadError.value = ''
  try {
    const res = await apiRequest<{ code: number; data?: { dictionary?: DictionaryGroup[] }; message?: string }>('GET', '/system/dictionary/ignore/getDictionarySelect')
    if (res.code !== 200) throw new Error(res.message || `错误码 ${res.code}`)
    const areaDictionary = (res.data?.dictionary || []).find(item => Number(item.dictionaryCode) === 701)
    if (!areaDictionary) throw new Error('未找到 dictCode=701')
    areaOptions.value = (areaDictionary.dictionaryDetailList || [])
      .map(item => ({
        value: Number(item.dictionaryTermValue),
        label: String(item.dictionaryTermName ?? item.dictionaryTermValue ?? ''),
      }))
      .filter(item => Number.isFinite(item.value) && item.label)
    if (!areaOptions.value.length) throw new Error('dictCode=701 暂无可用选项')
  } catch (e: any) {
    areaOptions.value = []
    areaLoadError.value = `绑定区域加载失败：${e.message}`
  } finally {
    areaLoading.value = false
  }
}

onMounted(async () => {
  document.addEventListener('pointerdown', closeCopyPanelOnOutside)
  console.log('[乐仓原型] v0.6.1 手写版已加载, embedded=', embedded.value)
  try {
    const [roleRes, dpRes, groupRes, deptRes, whRes] = await Promise.all([
      apiRequest<{ code: number; data: RoleOption[] }>('GET', '/system/role/getRoleSelect'),
      apiRequest<{ code: number; data: DataPermOption[] }>('GET', '/system/dataPermission/selectOption'),
      apiRequest<{ code: number; data: { list: DataPermOption[] } }>('POST', '/system/newPermission/listPermissionGroupPage', { body: { pageNum: 1, pageSize: 100 } }),
      apiRequest<{ code: number; data: DeptNode[] }>('GET', '/system/deptNew/getDeptList'),
      apiRequest<{ code: number; data: string[] }>('GET', '/tms/tmsSysWarehouse/ignore/selectCode'),
    ])
    if (roleRes.code === 200) roles.value = roleRes.data || []
    if (dpRes.code === 200) dataPerms.value = dpRes.data || []
    if (groupRes.code === 200) newDataPermGroups.value = groupRes.data?.list || []
    if (deptRes.code === 200) deptTree.value = deptRes.data || []
    if (whRes.code === 200) warehouseCodes.value = whRes.data || []
  } catch (e: any) {
    bridgeError.value = `下拉字典加载失败：${e.message}`
  }
  await loadAreaOptions()
  loadList()
})

onBeforeUnmount(() => {
  window.clearTimeout(copySearchTimer)
  document.removeEventListener('pointerdown', closeCopyPanelOnOutside)
})
</script>

<template>
  <main class="user-page">
    <div class="prototype-watermark" aria-hidden="true"></div>

    <header class="page-head"><button class="tab active">全部</button><button class="primary" @click="openForm(null, 'add')"><span aria-hidden="true">＋</span> 新增用户</button></header>
    <section class="filters" aria-label="用户筛选">
      <span class="search-field"><input v-model.trim="filters.username" placeholder="用户名" @keyup.enter="query"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg></span><input v-model.trim="filters.nickName" placeholder="姓名"><input v-model.trim="filters.jobNumber" placeholder="工号">
      <select v-model="filters.userType" aria-label="人员类型"><option value="">人员类型</option><option value="INTERNAL_EMPLOYEE">内部员工</option><option value="EXTERNAL_COLLABORATOR">外部协作人员</option><option value="INTERNAL_EMPLOYEE_TEMPORARY_SUB_ACCOUNT">内部员工（临时子账号）</option></select>
      <input v-model.trim="filters.roleName" placeholder="角色"><select v-model="filters.deleted" aria-label="状态"><option value="">状态</option><option value="0">启用</option><option value="1">禁用</option></select>
      <span class="filter-actions"><button class="query-btn" @click="query">查询</button><button class="reset-btn" @click="resetFilters">重置</button></span>
    </section>

    <div v-if="!embedded" class="bridge-tip">未在乐仓页面内打开，真实接口不可用。请从乐仓系统 /setting/user 页面右下角悬浮按钮打开原型。</div>
    <div v-else-if="bridgeError" class="bridge-tip error">{{ bridgeError }}</div>

    <div class="table-wrap"><table><thead><tr><th class="sticky-left">用户名</th><th>姓名</th><th>人员类型</th><th>角色</th><th>部门</th><th>时间</th><th>状态</th><th class="sticky-right operation-head">操作</th></tr></thead><tbody>
      <tr v-for="row in rows" :key="row.accountId">
        <td class="sticky-left" :title="row.username"><a @click="openForm(row, 'view')">{{ row.username }}</a></td>
        <td :title="row.nickName">{{ row.nickName }}</td>
        <td :title="userTypeLabels[row.userType] + (row.jobNumber ? `（${row.jobNumber}）` : '')">{{ userTypeLabels[row.userType] || row.userType }}<span v-if="row.userType === 'INTERNAL_EMPLOYEE' && row.jobNumber">（{{ row.jobNumber }}）</span></td>
        <td class="role-cell" :title="(row.roleName || []).join(', ')">{{ (row.roleName || []).join(', ') }}</td>
        <td class="department-cell" :title="deptPathName(row.fsDepartmentId)">{{ deptPathName(row.fsDepartmentId) || '-' }}</td>
        <td :title="row.createTime">{{ row.createTime }}</td>
        <td><span :class="['status', row.deleted ? 'disabled' : 'enabled']">{{ row.deleted ? '禁用' : '启用' }}</span></td>
        <td class="sticky-right actions"><button class="text-btn" title="详情" @click="openForm(row, 'view')">详情</button><button class="text-btn" title="编辑" @click="openForm(row, 'edit')">编辑</button><button class="more-btn" :title="row.deleted ? '启用' : '禁用'" @click="toggle(row)">•••</button></td>
      </tr>
      <tr v-if="!rows.length && !loading"><td colspan="8" class="empty">暂无符合条件的用户</td></tr>
      <tr v-if="loading"><td colspan="8" class="empty">加载中…</td></tr>
    </tbody></table></div>

    <footer class="pager"><span>共 {{ total }} 条</span><button :disabled="page === 1" @click="page--">‹</button><button :disabled="page >= totalPages" @click="page++">›</button><select v-model.number="pageSize"><option :value="10">10 条/页</option><option :value="20">20 条/页</option></select></footer>

    <div v-if="drawerOpen" class="drawer-mask" @click.self="closeDrawer"><aside class="drawer" role="dialog" aria-modal="true">
      <header><button aria-label="关闭" @click="closeDrawer">×</button><strong>{{ drawerMode === 'add' ? '新增用户' : drawerMode === 'edit' ? '编辑用户' : '详情' }}</strong></header>
      <div class="drawer-body">
        <section><h3>基础数据</h3><div class="form-grid">
          <label class="required">用户名<input v-model.trim="form.username" maxlength="50" placeholder="请输入" :disabled="isView"></label>
          <label>启用状态<span class="switch-row"><input v-model="form.enabled" type="checkbox" role="switch" :disabled="isView"><span>{{ form.enabled ? '启用' : '禁用' }}</span></span></label>
          <label class="required">密码<input v-model="form.password" type="password" autocomplete="new-password" placeholder="最少8位，包含字母和数字" :disabled="isView"></label>
          <label class="required">确认密码<input v-model="form.confirmPassword" type="password" autocomplete="new-password" placeholder="请再次输入" :disabled="isView"></label>
        </div></section>
        <section><h3>人员信息</h3><div class="form-grid">
          <label class="required">人员类型<select v-model="form.userType" :disabled="isView" @change="changeUserType"><option value="">请选择人员类型</option><option value="INTERNAL_EMPLOYEE">内部员工</option><option value="EXTERNAL_COLLABORATOR">外部协作人员</option><option v-if="drawerMode === 'edit'" value="INTERNAL_EMPLOYEE_TEMPORARY_SUB_ACCOUNT">内部员工（临时子账号）</option></select></label>
          <label v-if="form.userType === 'INTERNAL_EMPLOYEE'" class="required">员工
            <input v-model="form.employee" placeholder="输入姓名查询" list="hr-employee-list" :disabled="isView" @input="onEmployeeInput" @change="onEmployeeBlur">
            <datalist id="hr-employee-list"><option v-for="emp in employeeOptions" :key="emp.empNo" :value="emp.name">（{{ emp.empNo }}）</option></datalist>
          </label>
          <label>工号<input v-model.trim="form.empNo" maxlength="10" :placeholder="isInternal ? '自动带出' : '请输入'" :disabled="isView || isInternal"></label>
          <label class="required">姓名<input v-model.trim="form.name" :placeholder="isInternal ? '自动带出可修改' : '请输入'" :disabled="isView"></label>
          <label>电话<input v-model.trim="form.phone" :placeholder="isInternal ? '自动带出' : '请输入'" :disabled="isView"></label><label>邮箱<input v-model.trim="form.email" maxlength="100" :placeholder="isInternal ? '自动带出' : '请输入'" :disabled="isView"></label>
          <label :class="{ required: isInternal }">部门
            <select v-model="form.fsDepartmentId" :disabled="isView"><option value="">请选择</option><option v-for="d in flatDeptOptions" :key="d.value" :value="d.value">{{ d.label }}</option></select>
          </label>
          <label class="required">时区<select v-model="form.zoneCode" :disabled="isView"><option value="">请选择时区</option><option v-for="item in zoneOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
          <label :class="{ required: isInternal }">入职日期<input v-model="form.employment" type="date" :disabled="isView"></label>
        </div></section>
        <section>
          <div class="section-head">
            <h3>权限信息</h3>
            <div v-if="!isView" class="copy-permission-entry">
              <span class="copy-purpose">复制已有用户权限：</span>
              <div ref="copySearchRoot" class="copy-search-head" :class="{ 'has-copy': copiedFromUser, 'is-open': copyPanelOpen }">
                <input v-if="!copiedFromUser" v-model="copyKeyword" placeholder="搜索用户名、姓名或工号" @input="onCopyKeywordInput" @click="toggleCopyPanel" :disabled="isView">
                <div v-else class="copy-selected-display" :title="copiedFromUser" @click="toggleCopyPanel">
                  <span>{{ copiedFromUser }}</span>
                  <button type="button" class="copy-selection-clear" title="清空已选用户" aria-label="清空已选用户" @click.stop="clearSelectedCopyUser" :disabled="isView">×</button>
                </div>
                <button v-if="copiedFromUser" type="button" class="copy-apply" title="将所选用户的权限覆盖到当前用户" @click="reapplyCopyUser" :disabled="isView">复制</button>
                <div v-if="copyPanelOpen" class="copy-panel">
                  <div class="copy-guide">选择一个用户，将其角色和数据权限复制到当前用户</div>
                  <div v-if="copySearching" class="copy-empty">搜索中…</div>
                  <div v-else-if="!copyResults.length" class="copy-empty">未找到用户，请更换用户名、姓名或工号</div>
                  <button v-for="u in copyResults" v-else :key="u.accountId" type="button" @mousedown.prevent @click="selectCopyUser(u)"><strong>{{ u.nickName || '-' }}</strong><span>{{ u.username }}<template v-if="u.jobNumber"> · 工号：{{ u.jobNumber }}</template></span></button>
                </div>
              </div>
            </div>
          </div>
          <div class="form-grid">
          <div class="permission-field required"><span>角色：</span><PermissionSelect v-model="form.roleIds" :options="roleSelectOptions" multiple clearable dialog :disabled="isView" label="角色" :group-hints="{ 'WMS 仓库角色': '该分类下角色均需绑定WMS端仓库' }" /></div>
          <div v-if="showAreas" class="permission-field required"><span>绑定区域：<small class="field-tip">限定销售业务范围及可分配客户的区域。</small></span><PermissionSelect v-model="form.saleAreaCodes" :options="areaOptions" multiple clearable :disabled="isView || areaLoading" label="绑定区域" /><small v-if="areaLoading" class="field-state">区域选项加载中…</small><small v-else-if="areaLoadError" class="field-state error">{{ areaLoadError }}</small></div>
          <div v-if="showWarehouses" class="permission-field required"><span>绑定WMS端仓库：</span><PermissionSelect v-model="form.warehouseList" :options="warehouseSelectOptions" multiple clearable dialog :disabled="isView" label="绑定WMS端仓库" /></div>
          <div class="permission-field"><span>数据权限：</span><PermissionSelect v-model="form.dataPermissionIds" :options="dataSelectOptions" multiple clearable dialog :disabled="isView" label="数据权限" /></div>
          <div class="permission-field"><span>NEW数据权限：</span><PermissionSelect :model-value="form.groupId" :options="groupSelectOptions" clearable placement="up" :disabled="isView" label="NEW数据权限" @update:model-value="form.groupId = $event as number | null" /></div>
        </div></section><p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
      </div>
      <footer><label v-if="drawerMode === 'add'" class="recreate"><input v-model="recreate" type="checkbox"> 保存后再创建一个</label><button @click="closeDrawer">取消</button><button v-if="!isView" class="primary" @click="save">保存</button></footer>
    </aside></div>
    <div v-if="message" class="toast" role="status">{{ message }}</div>
  </main>
</template>
