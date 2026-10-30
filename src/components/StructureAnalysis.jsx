export function StructureAnalysis({ data, error, loading, retry }) {
  return <section className="card structure-analysis" aria-label="Python structure analysis" aria-busy={loading}>
    <div className="section-title"><h2>Python structure</h2><span className="badge">Static analysis · code never executed</span></div>
    {loading ? <p role="status">Checking syntax and reading the Python structure…</p>
      : error ? <div role="alert"><p>{error}</p><button onClick={retry}>Retry analysis</button></div>
      : !data ? <p>Click Explain code to check syntax and inspect functions, loops, variables and imports in your code.</p>
      : !data.syntax_valid ? <div role="alert" className="syntax-error"><h3>Syntax error on line {data.syntax_error.line}</h3><p>Column {data.syntax_error.col}: {data.syntax_error.message}</p><small>This error comes from the Python parser. Fix it and try again.</small></div>
      : <><p role="status">Python syntax parsed successfully. Runtime behavior has not been checked.</p><div className="structure-grid">
        <div><h3>Functions ({data.functions.length})</h3>{data.functions.length ? data.functions.map((f, i) => <p key={i}><code>{f.qualified_name}({f.args.join(', ')})</code><small>Lines {f.start_line}–{f.end_line}</small></p>) : <p>None found.</p>}</div>
        <div><h3>Control flow</h3><p>{data.loops.length} loops · {data.conditionals.length} conditionals</p>{[...data.loops, ...data.conditionals].map((n, i) => <p key={i}>{n.kind} <small>Lines {n.start_line}–{n.end_line}</small></p>)}</div>
        <div><h3>Variables / parameters</h3>{data.variables.length ? data.variables.map((v, i) => <p key={i}><code>{v.name}</code><small>Line {v.line} · {v.scope}</small></p>) : <p>None found.</p>}</div>
        <div><h3>Imports</h3>{data.imports.length ? data.imports.map((v, i) => <p key={i}><code>{v.module ? `${'.'.repeat(v.level)}${v.module}: ` : ''}{v.names.map(n => n.name + (n.alias ? ` as ${n.alias}` : '')).join(', ')}</code></p>) : <p>None found.</p>}</div>
      </div><h3>Complexity estimate: {data.complexity.estimate}</h3><p>{data.complexity.note}</p><small>Maximum loop nesting: {data.complexity.loop_nesting}. Heuristic only.</small></>}
  </section>;
}
