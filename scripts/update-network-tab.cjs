const fs = require('fs');
let code = fs.readFileSync('src/routes/dashboard/network.tsx', 'utf8');

// 1. Add validateSearch to route definition
code = code.replace(
  'export const Route = createFileRoute("/dashboard/network")({\n  component: NetworkPage,\n});',
  'export const Route = createFileRoute("/dashboard/network")({\n  component: NetworkPage,\n  validateSearch: (search) => ({\n    tab: String(search["tab"] || "tree"),\n  }),\n});'
);

// 2. Replace the activeTab state with search param
code = code.replace(
  'function NetworkPage() {\n  const [activeTab, setActiveTab] = useState<NetworkTab>("tree");',
  'function NetworkPage() {\n  const search = Route.useSearch();\n  const tab = (search as any).tab as string || "tree";\n  const activeTab = (tab === "downline" || tab === "direct" || tab === "levels" ? tab : "tree") as NetworkTab;'
);

// 3. Remove the tab bar div (flex gap-1 overflow-x-auto)
const lines = code.split('\n');
const result = [];
let skipDepth = 0;
let inTabBar = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (!inTabBar && line.includes('flex gap-1 overflow-x-auto rounded border border-gold/20')) {
    inTabBar = true;
    // Count opening divs on this line
    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    skipDepth = opens - closes;
    if (skipDepth <= 0) {
      inTabBar = false;
      skipDepth = 0;
    }
    continue;
  }
  
  if (inTabBar) {
    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    skipDepth += opens - closes;
    if (skipDepth <= 0) {
      inTabBar = false;
      skipDepth = 0;
    }
    continue;
  }
  
  result.push(line);
}

fs.writeFileSync('src/routes/dashboard/network.tsx', result.join('\n'));
console.log('network.tsx updated successfully');
