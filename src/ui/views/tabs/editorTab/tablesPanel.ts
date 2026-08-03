import { escapeHtml } from '../../../../domain/text/escapeHtml';
import type { TableInfo } from '../../../../runtime/sql/SqlEngine';
import type { AppContext } from '../../../context';
import { mountView } from '../../../mount';
import type { AppState } from '../../../state/appState';
import type { Unsubscribe } from '../../../state/store';

interface TablesPanelSlice {
  tables: TableInfo[] | null;
  givenTableNames: string[];
}

function sliceTablesPanel(state: AppState): TablesPanelSlice {
  return { tables: state.session.tablesInfo, givenTableNames: state.session.givenTableNames };
}

function renderTables(slice: TablesPanelSlice): string {
  const { tables, givenTableNames } = slice;
  if (!tables || !tables.length) {
    return '<div class="empty-state">Noch keine Tabellen vorhanden.</div>';
  }
  const given = new Set(givenTableNames);
  return tables
    .map((t) => {
      const cols = t.columns.map((c) => `${c.name} ${c.type}`).join(', ');
      const badge = given.has(t.name) ? ' <span class="t-given-badge">vorgegeben</span>' : '';
      return `<div class="table-entry"><span class="t-name">${escapeHtml(t.name)}</span>${badge} <span class="t-cols">(${escapeHtml(cols)})</span> — <span class="t-count">${t.rowCount} Zeile(n)</span></div>`;
    })
    .join('');
}

/**
 * Read-only inspector of the live engine schema; the cache is refreshed by
 * actions after every run/reset/open. Tables that were already there when
 * the challenge opened (from its own or an ancestor's `setup`) are marked
 * "vorgegeben" — without this, a challenge whose solution references an
 * existing row (e.g. `WHERE id = 2`) gives no visible way to tell what
 * already exists versus what the user's own solution is expected to create.
 */
export function mountTablesPanel(root: HTMLElement, ctx: AppContext): Unsubscribe {
  return mountView(
    root,
    ctx.store,
    sliceTablesPanel,
    {
      render: renderTables,
      shouldUpdate: (prev, next) =>
        prev.tables !== next.tables ||
        prev.givenTableNames.length !== next.givenTableNames.length ||
        prev.givenTableNames.some((name, i) => name !== next.givenTableNames[i]),
    },
    ctx,
  );
}
