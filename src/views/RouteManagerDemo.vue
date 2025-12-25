<script setup lang="ts">
import { computed, reactive, ref, watch, defineComponent, h } from 'vue';
import type { PropType } from 'vue';
import { RouterLink } from 'vue-router';
import { DynamicRouteManager } from '../utils/RouterManager/RouterManager';
import type { IRouteDataSource } from '../utils/RouterManager/RouterData';
import type { BuiltRoute, ServerRouteNode, ServerRouteResponse } from '../utils/RouterManager';
import { viewMap } from '../utils/RouterManager/ViewMap';
import { router } from '../router';

type DatasetKey = 'basic' | 'expanded';
type EditableNode = ServerRouteNode & { children?: EditableNode[] };

const LOCAL_STORAGE_KEY = 'router_manager_demo_local';

const baseDatasets: Record<DatasetKey, { version: string; routes: EditableNode[]; componentMapping: Record<string, string> }> = {
    basic: {
        version: '1.0.0',
        componentMapping: {
            '101': 'home',
            '102': 'about',
            '103': 'alpha',
            '104': 'beta',
            '105': 'my'
        },
        routes: [
            { path: '/home', name: 'Home', componentId: '101', meta: { title: '首页' } },
            { path: '/about', name: 'About', componentId: '102', meta: { title: '关于' } },
            { path: '/alpha', name: 'AlphaPage', componentId: '103', meta: { title: '页面 A' } },
            { path: '/legacy-home', name: 'LegacyHome', redirect: '/home', meta: { title: '重定向到首页' } },
            {
                path: '/workspace',
                name: 'Workspace',
                componentId: '101',
                redirect: '/workspace/profile',
                meta: { title: '工作台' },
                children: [
                    { path: 'profile', name: 'Profile', componentId: '105', meta: { title: '个人中心' } },
                    { path: 'reports', name: 'Reports', componentId: '104', meta: { title: '报表(Beta)' } },
                    { path: 'entry', name: 'WorkspaceEntry', redirect: '/workspace/reports', meta: { title: '子路由重定向' } }
                ]
            }
        ]
    },
    expanded: {
        version: '2.0.0',
        componentMapping: {
            '201': 'home',
            '202': 'about',
            '203': 'alpha',
            '204': 'beta',
            '205': 'gamma',
            '206': 'delta',
            '207': 'my'
        },
        routes: [
            { path: '/home', name: 'Home', componentId: '201', meta: { title: '首页', icon: 'home' } },
            { path: '/about', name: 'About', componentId: '202', meta: { title: '关于', keepAlive: true } },
            { path: '/alpha', name: 'AlphaPage', componentId: '203', meta: { title: '页面 A' } },
            { path: '/beta', name: 'BetaPage', componentId: '204', meta: { title: '页面 B' } },
            { path: '/gamma', name: 'GammaPage', componentId: '205', meta: { title: '页面 C', keepAlive: true } },
            { path: '/lab-redirect', name: 'LabRedirect', redirect: '/gamma', meta: { title: '重定向到 Gamma' } },
            {
                path: '/workspace',
                name: 'Workspace',
                componentId: '201',
                redirect: '/workspace/profile',
                meta: { title: '工作台', icon: 'grid' },
                children: [
                    { path: 'profile', name: 'Profile', componentId: '207', meta: { title: '个人中心' } },
                    { path: 'tasks', name: 'Tasks', componentId: '206', meta: { title: '任务面板 (Delta)' } },
                    { path: 'reports', name: 'Reports', componentId: '204', meta: { title: '报表' } },
                    { path: 'entry', name: 'WorkspaceEntry', redirect: '/workspace/tasks', meta: { title: '子路由重定向' } }
                ]
            }
        ]
    }
};

const selectedDataset = ref<DatasetKey>('basic');
const cache = ref<ServerRouteResponse | null>(null);
const dynamicRoutes = ref<BuiltRoute[]>([]);
const loading = ref(false);
const status = ref('');
const revision = ref(0);
const localVersion = ref<string | null>(null);

const editableRoutes = ref<EditableNode[]>(cloneRoutes(baseDatasets[selectedDataset.value].routes));
const componentKeys = Object.keys(viewMap);
const componentMapping = computed(() => baseDatasets[selectedDataset.value].componentMapping);

const form = reactive({
    name: '',
    path: '',
    componentId: '',
    componentKey: componentKeys[0] ?? '',
    redirect: '',
    title: '',
    keepAlive: false,
    hidden: false
});
const selectedPath = ref<string | null>(null);

const currentVersion = computed(() => `${baseDatasets[selectedDataset.value].version}-rev${revision.value}`);
const currentResponse = computed<ServerRouteResponse>(() => ({
    version: currentVersion.value,
    routes: sanitizeRoutes(editableRoutes.value),
    componentMapping: componentMapping.value
}));
const previewRoutes = computed(() => editableRoutes.value);
const cacheVersion = computed(() => cache.value?.version ?? '无');

class MemoryRouteDataSource implements IRouteDataSource {
    constructor(
        private getResponse: () => ServerRouteResponse,
        private cacheBox: { value: ServerRouteResponse | null }
    ) {}

    async fetch(): Promise<ServerRouteResponse> {
        await new Promise(resolve => setTimeout(resolve, 160));
        return JSON.parse(JSON.stringify(this.getResponse()));
    }

    readCache(): ServerRouteResponse | null {
        return this.cacheBox.value;
    }

    writeCache(resp: ServerRouteResponse): void {
        this.cacheBox.value = resp;
    }

    isSameVersion(localVersion: string | null, remoteVersion: string): boolean {
        return !!localVersion && localVersion === remoteVersion;
    }
}

const dataSource = new MemoryRouteDataSource(
    () => currentResponse.value,
    cache
);
const manager = new DynamicRouteManager(dataSource);

watch(selectedDataset, () => {
    resetEditor();
    resetCache();
    clearDynamicRoutes();
    status.value = '已切换数据集，缓存和动态路由已重置';
});

function cloneRoutes(routes: EditableNode[]): EditableNode[] {
    return JSON.parse(JSON.stringify(routes));
}

function sanitizeRoutes(nodes: EditableNode[]): ServerRouteNode[] {
    return nodes.map(n => ({
        path: n.path,
        name: n.name,
        componentKey: n.componentKey,
        componentId: n.componentId,
        redirect: n.redirect,
        meta: n.meta,
        props: n.props,
        hidden: n.hidden,
        children: n.children ? sanitizeRoutes(n.children) : undefined
    }));
}

function bumpRevision() {
    revision.value += 1;
}

function resetEditor() {
    editableRoutes.value = cloneRoutes(baseDatasets[selectedDataset.value].routes);
    selectedPath.value = null;
    fillForm(null);
    bumpRevision();
    localVersion.value = null;
    form.componentId = '';
}

function resetCache() {
    cache.value = null;
}

function clearDynamicRoutes() {
    manager.getDynamicRoutes().forEach(r => {
        if (r.name && router.hasRoute(r.name)) {
            router.removeRoute(r.name);
        }
    });
    dynamicRoutes.value = [];
}

function getNodeByPath(path: string | null): EditableNode | null {
    if (!path) return null;
    const indexes = path.split('-').map(i => Number(i));
    let list: EditableNode[] = editableRoutes.value;
    let node: EditableNode | undefined;
    for (const idx of indexes) {
        node = list[idx];
        if (!node) return null;
        list = node.children ?? [];
    }
    return node ?? null;
}

function fillForm(node: EditableNode | null) {
    form.name = node?.name ?? '';
    form.path = node?.path ?? '';
    form.componentId = node?.componentId ?? '';
    form.componentKey = node?.componentKey ?? componentKeys[0] ?? '';
    form.redirect = node?.redirect ?? '';
    form.title = (node?.meta as any)?.title ?? '';
    form.keepAlive = Boolean((node?.meta as any)?.keepAlive);
    form.hidden = Boolean((node?.meta as any)?.hidden);
}

function selectNode(path: string) {
    selectedPath.value = path;
    fillForm(getNodeByPath(path));
}

function applyFormToNode() {
    const node = getNodeByPath(selectedPath.value);
    if (!node) {
        status.value = '请先选择需要更新的路由';
        return;
    }
    node.name = form.name.trim() || node.name;
    node.path = form.path.trim() || node.path;
    node.componentId = form.componentId.trim() || undefined;
    node.componentKey = form.componentKey;
    node.redirect = form.redirect.trim() || undefined;
    const meta: Record<string, unknown> = { ...(node.meta || {}) };
    if (form.title) meta.title = form.title;
    else delete meta.title;
    if (form.keepAlive) meta.keepAlive = true;
    else delete meta.keepAlive;
    if (form.hidden) meta.hidden = true;
    else delete meta.hidden;
    node.meta = Object.keys(meta).length ? meta : undefined;
    bumpRevision();
    status.value = '已更新当前路由';
}

function makeNewNode(title: string): EditableNode {
    return {
        path: `/new-${Math.random().toString(36).slice(2, 6)}`,
        name: `Route${Date.now().toString(16)}`,
        componentKey: componentKeys[0] ?? 'home',
        componentId: '',
        meta: { title }
    };
}

function addRootRoute() {
    editableRoutes.value.push(makeNewNode('新建根路由'));
    bumpRevision();
    selectedPath.value = String(editableRoutes.value.length - 1);
    fillForm(getNodeByPath(selectedPath.value));
    status.value = '已添加根路由';
}

function addChildRoute() {
    const parent = getNodeByPath(selectedPath.value);
    if (!parent) {
        status.value = '请先选择父节点再添加子路由';
        return;
    }
    parent.children = parent.children || [];
    parent.children.push(makeNewNode('新建子路由'));
    bumpRevision();
    selectedPath.value = `${selectedPath.value}-${parent.children.length - 1}`;
    fillForm(getNodeByPath(selectedPath.value));
    status.value = '已添加子路由';
}

function deleteSelected() {
    if (!selectedPath.value) {
        status.value = '未选择路由，无法删除';
        return;
    }
    const parts = selectedPath.value.split('-').map(i => Number(i));
    if (!parts.length) return;
    if (parts.length === 1) {
        editableRoutes.value.splice(parts[0], 1);
    } else {
        const parentPath = parts.slice(0, -1).join('-');
        const parent = getNodeByPath(parentPath);
        if (parent?.children) parent.children.splice(parts[parts.length - 1], 1);
    }
    selectedPath.value = null;
    fillForm(null);
    bumpRevision();
    status.value = '已删除所选路由';
}

function saveLocal() {
    const payload: ServerRouteResponse = {
        version: currentVersion.value,
        routes: sanitizeRoutes(editableRoutes.value),
        componentMapping: componentMapping.value
    };
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
        localVersion.value = payload.version;
        status.value = `已保存到本地存储，版本 ${payload.version}`;
    } catch (err: any) {
        status.value = err?.message ?? '保存本地失败';
    }
}

function loadLocal() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) {
            status.value = '本地存储暂无数据';
            return;
        }
        const parsed: ServerRouteResponse = JSON.parse(raw);
        editableRoutes.value = cloneRoutes(parsed.routes as EditableNode[]);
        selectedPath.value = null;
        fillForm(null);
        revision.value = 0;
        baseDatasets[selectedDataset.value].version = parsed.version || baseDatasets[selectedDataset.value].version;
        if (parsed.componentMapping) baseDatasets[selectedDataset.value].componentMapping = parsed.componentMapping;
        localVersion.value = parsed.version ?? null;
        status.value = `已从本地加载版本 ${parsed.version ?? '未知'}`;
    } catch (err: any) {
        status.value = err?.message ?? '读取本地失败';
    }
}

const loadRoutes = async (force = false) => {
    loading.value = true;
    const versionChanged = cache.value?.version !== currentVersion.value;
    const shouldForce = force || versionChanged || cache.value === null || !dynamicRoutes.value.length;
    status.value = shouldForce ? '强制刷新中...' : '加载中...';
    if (shouldForce) clearDynamicRoutes();

    try {
        await manager.ensureLoaded({ force: shouldForce });
        dynamicRoutes.value = manager.getDynamicRoutes();
        status.value = `已注册 ${dynamicRoutes.value.length} 条动态路由`;
    } catch (err: any) {
        status.value = err?.message ?? String(err);
    } finally {
        loading.value = false;
    }
};

const formatMeta = (meta: unknown) => {
    if (!meta || typeof meta !== 'object') return '无';
    const entries = Object.entries(meta as Record<string, unknown>);
    if (!entries.length) return '无';
    return entries.map(([k, v]) => `${k}: ${String(v)}`).join(' · ');
};

const resolveComponentKey = (node: ServerRouteNode) => {
    const mapped = node.componentId ? componentMapping.value[node.componentId] : undefined;
    return mapped ?? node.componentKey ?? '未指定';
};

const TreeItem = defineComponent({
    name: 'TreeItem',
    props: {
        node: { type: Object as PropType<ServerRouteNode>, required: true },
        path: { type: String, required: true },
        selected: { type: String as PropType<string | null>, default: null }
    },
    emits: ['select'],
    setup(props, { emit }) {
        const onSelect = () => emit('select', props.path);
        return () => h('li', { class: { selected: props.selected === props.path } }, [
            h('div', { class: 'tree-line', onClick: onSelect }, [
                h('div', [
                    h('strong', props.node.name),
                    h('span', { class: 'muted' }, `· ${props.node.path}`),
                    props.node.redirect ? h('span', { class: 'pill' }, `redirect → ${props.node.redirect}`) : null,
                    props.node.componentId ? h('span', { class: 'pill ghost-pill' }, `id=${props.node.componentId}`) : null,
                    h('span', { class: 'pill ghost-pill' }, `comp=${resolveComponentKey(props.node)}`)
                ]),
                h('div', { class: 'meta' }, `meta: ${formatMeta(props.node.meta)}`)
            ]),
            props.node.children?.length
                ? h(
                    'ul',
                    { class: 'route-tree child' },
                    props.node.children.map((child, idx) =>
                        h(TreeItem, {
                            node: child,
                            path: `${props.path}-${idx}`,
                            selected: props.selected,
                            onSelect: (p: string) => emit('select', p)
                        })
                    )
                )
                : null
        ]);
    }
});
</script>

<template>
  <div class="route-page">
    <section class="panel">
      <div class="panel__header">
        <div>
          <p class="label">数据源</p>
          <h2>路由管理测试台（组件映射版）</h2>
        </div>
        <span class="badge">RouterManager</span>
      </div>

      <div class="grid">
        <div class="field">
          <p class="label">选择数据集</p>
          <select v-model="selectedDataset">
            <option value="basic">基础数据 (v1.0.0)</option>
            <option value="expanded">扩展数据 (v2.0.0)</option>
          </select>
        </div>
        <div class="field">
          <p class="label">当前版本</p>
          <strong>{{ currentVersion }}</strong>
        </div>
        <div class="field">
          <p class="label">缓存版本</p>
          <strong>{{ cacheVersion }}</strong>
        </div>
        <div class="field">
          <p class="label">本地存储版本</p>
          <strong>{{ localVersion ?? '无' }}</strong>
        </div>
      </div>

      <div class="actions">
        <button @click="loadRoutes()" :disabled="loading">
          {{ loading ? '加载中...' : '加载 (使用缓存/版本判断)' }}
        </button>
        <button class="primary" @click="loadRoutes(true)" :disabled="loading">
          {{ loading ? '刷新中...' : '强制刷新' }}
        </button>
        <button class="ghost" @click="resetCache()" :disabled="loading">
          清空缓存
        </button>
        <button class="ghost" @click="saveLocal()" :disabled="loading">
          保存到本地
        </button>
        <button class="ghost" @click="loadLocal()" :disabled="loading">
          从本地加载
        </button>
      </div>

      <p class="status" v-if="status">{{ status }}</p>
    </section>

    <section class="panel">
      <div class="panel__header">
        <h3>组件映射表 (id -> 组件 key)</h3>
        <span class="hint">后端返回的映射数据，编辑路由时优先填写组件 id</span>
      </div>
      <div class="mapping-grid">
        <div v-for="(key, id) in componentMapping" :key="id" class="mapping-item">
          <span class="mapping-id">ID: {{ id }}</span>
          <span class="mapping-key">组件: {{ key }}</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel__header">
        <h3>路由结构编辑 & 重定向测试</h3>
        <span class="hint">路由基于组件映射 (id->key) 解析，未映射时使用 componentKey</span>
      </div>

      <div class="editor-grid">
        <div class="editor">
          <div class="field">
            <p class="label">名称 (name)</p>
            <input v-model="form.name" placeholder="唯一的路由 name" />
          </div>
          <div class="field">
            <p class="label">路径 (path)</p>
            <input v-model="form.path" placeholder="/path 或 子路径" />
          </div>
          <div class="field">
            <p class="label">组件 ID (后端映射)</p>
            <input v-model="form.componentId" placeholder="优先填写组件 id" />
          </div>
          <div class="field">
            <p class="label">组件 key (备用)</p>
            <select v-model="form.componentKey">
              <option v-for="key in componentKeys" :key="key" :value="key">{{ key }}</option>
            </select>
          </div>
          <div class="field">
            <p class="label">重定向</p>
            <input v-model="form.redirect" placeholder="例如 /home 或 /workspace/profile" />
          </div>
          <div class="field">
            <p class="label">Meta</p>
            <div class="meta-row">
              <input v-model="form.title" placeholder="meta.title" />
              <label><input type="checkbox" v-model="form.keepAlive" /> keepAlive</label>
              <label><input type="checkbox" v-model="form.hidden" /> hidden</label>
            </div>
          </div>
          <div class="editor-actions">
            <button class="primary" @click="applyFormToNode">更新所选路由</button>
            <button @click="addRootRoute">新增根路由</button>
            <button @click="addChildRoute">在所选节点下新增子路由</button>
            <button class="ghost" @click="deleteSelected">删除所选路由</button>
          </div>
          <p class="hint">当前选中：{{ selectedPath ?? '未选择' }}</p>
        </div>

        <div class="tree">
          <ul class="route-tree">
            <TreeItem
              v-for="(route, idx) in previewRoutes"
              :key="route.name || route.path"
              :node="route"
              :path="String(idx)"
              :selected="selectedPath"
              @select="selectNode"
            />
          </ul>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel__header">
        <h3>即将加载的路由</h3>
        <span class="hint">带有重定向的路由可直接点击下方导航测试</span>
      </div>
      <ul class="route-list">
        <li v-for="route in previewRoutes" :key="route.name">
          <div class="route-line">
            <div>
              <strong>{{ route.name }}</strong>
              <span class="muted">· {{ route.path }}</span>
              <span v-if="route.redirect" class="pill">redirect → {{ route.redirect }}</span>
              <span v-if="route.componentId" class="pill ghost-pill">id={{ route.componentId }}</span>
              <span class="pill ghost-pill">comp={{ resolveComponentKey(route) }}</span>
            </div>
            <div class="meta">meta: {{ formatMeta(route.meta) }}</div>
          </div>

          <ul v-if="route.children?.length" class="child-list">
            <li v-for="child in route.children" :key="child.name">
              <div class="route-line">
                <div>
                  <strong>{{ child.name }}</strong>
                  <span class="muted">· /{{ child.path }}</span>
                  <span v-if="child.redirect" class="pill">redirect → {{ child.redirect }}</span>
                  <span v-if="child.componentId" class="pill ghost-pill">id={{ child.componentId }}</span>
                  <span class="pill ghost-pill">comp={{ resolveComponentKey(child) }}</span>
                </div>
                <div class="meta">meta: {{ formatMeta(child.meta) }}</div>
              </div>
            </li>
          </ul>
        </li>
      </ul>
    </section>

    <section class="panel">
      <div class="panel__header">
        <h3>已注册的动态路由</h3>
        <div class="tiny-actions">
          <button class="ghost" @click="clearDynamicRoutes" :disabled="loading || !dynamicRoutes.length">
            移除已加载的动态路由
          </button>
        </div>
      </div>

      <div v-if="!dynamicRoutes.length" class="empty">
        尚未加载动态路由，点击上方按钮开始测试。
      </div>
      <ul v-else class="route-list">
        <li v-for="route in dynamicRoutes" :key="route.name || route.path">
          <div class="route-line">
            <div>
              <strong>{{ route.name || '(未命名)' }}</strong>
              <span class="muted">· {{ route.path }}</span>
              <span v-if="route.redirect" class="pill">redirect → {{ route.redirect }}</span>
            </div>
            <div class="meta">meta: {{ formatMeta(route.meta) }}</div>
          </div>

          <ul v-if="route.children?.length" class="child-list">
            <li v-for="child in route.children" :key="child.name || child.path">
              <div class="route-line">
                <div>
                  <strong>{{ child.name || '(未命名)' }}</strong>
                  <span class="muted">· /{{ child.path }}</span>
                  <span v-if="child.redirect" class="pill">redirect → {{ child.redirect }}</span>
                </div>
                <div class="meta">meta: {{ formatMeta(child.meta) }}</div>
              </div>
            </li>
          </ul>
        </li>
      </ul>
    </section>

    <section class="panel">
      <div class="panel__header">
        <h3>导航测试</h3>
        <span class="hint">加载路由后，尝试直接点击含重定向的入口</span>
      </div>
      <div class="links">
        <RouterLink to="/home">/home</RouterLink>
        <RouterLink to="/about">/about</RouterLink>
        <RouterLink to="/alpha">/alpha</RouterLink>
        <RouterLink to="/beta">/beta</RouterLink>
        <RouterLink to="/gamma">/gamma</RouterLink>
        <RouterLink to="/legacy-home">/legacy-home</RouterLink>
        <RouterLink to="/lab-redirect">/lab-redirect</RouterLink>
        <RouterLink to="/workspace/profile">/workspace/profile</RouterLink>
        <RouterLink to="/workspace/reports">/workspace/reports</RouterLink>
        <RouterLink to="/workspace/entry">/workspace/entry</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.route-page {
  display: grid;
  gap: 18px;
}

.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 10px 25px rgba(31, 47, 70, 0.05);
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.badge {
  background: #1f6feb;
  color: #fff;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.label {
  color: #6b7280;
  margin: 0 0 4px;
  font-size: 13px;
}

.grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.field input,
.field select {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #d2d6dc;
  background: #f9fafb;
}

.actions {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

button {
  cursor: pointer;
  border: 1px solid #d0d7de;
  background: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  transition: all 0.2s ease;
  font-weight: 600;
  color: #1f2933;
}

button.primary {
  background: #1f6feb;
  border-color: #1f6feb;
  color: #fff;
  box-shadow: 0 8px 16px rgba(31, 111, 235, 0.18);
}

button.ghost {
  background: #f5f7fb;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.05);
}

.status {
  margin-top: 8px;
  color: #1f6feb;
  font-weight: 600;
}

.route-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.route-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fdfefe;
}

.child-list {
  list-style: none;
  padding-left: 12px;
  margin: 8px 0 0;
  display: grid;
  gap: 8px;
}

.meta {
  color: #6b7280;
  font-size: 12px;
}

.muted {
  color: #9ca3af;
  margin-left: 6px;
}

.pill {
  background: #eef2ff;
  color: #4338ca;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  margin-left: 8px;
}

.pill.ghost-pill {
  background: #f0f4ff;
  color: #1f2937;
}

.hint {
  color: #6b7280;
  font-size: 12px;
}

.tiny-actions {
  display: flex;
  gap: 8px;
}

.empty {
  padding: 14px;
  background: #f5f7fb;
  border-radius: 10px;
  color: #6b7280;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.links a {
  padding: 8px 12px;
  background: #f5f7fb;
  border-radius: 10px;
  color: #111827;
  text-decoration: none;
  transition: all 0.2s ease;
}

.links a:hover {
  background: #e7efff;
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.editor {
  display: grid;
  gap: 12px;
  align-content: start;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tree {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  background: #fafbfc;
}

.route-tree {
  list-style: none;
  padding-left: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.route-tree.child {
  padding-left: 12px;
}

.tree-line {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.route-tree li.selected > .tree-line {
  border-color: #1f6feb;
  background: #eaf2ff;
}

.mapping-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.mapping-item {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.mapping-id {
  color: #1f2937;
  font-weight: 600;
}

.mapping-key {
  color: #374151;
}

@media (max-width: 600px) {
  .route-line {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
