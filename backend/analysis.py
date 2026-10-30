"""Static structure extraction; no imports from submitted programs are loaded."""
import ast


def analyze_source(source: str) -> dict:
    result = dict(syntax_valid=True, syntax_error=None, functions=[], loops=[],
                  conditionals=[], variables=[], imports=[], complexity=None)
    try:
        tree = ast.parse(source)
    except SyntaxError as error:
        result.update(syntax_valid=False, syntax_error={
            'line': error.lineno or 1, 'col': error.offset or 1,
            'message': error.msg})
        return result

    # Iterative walking avoids recursion in the analysis visitor itself.
    stack = [(tree, 'module', 0)]
    max_depth = 0
    uncertain = False
    while stack:
        node, scope, depth = stack.pop()
        child_scope, child_depth = scope, depth
        location = {'start_line': getattr(node, 'lineno', 1),
                    'end_line': getattr(node, 'end_lineno', 1)}
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            args = node.args
            names = [a.arg for a in [*args.posonlyargs, *args.args]]
            if args.vararg:
                names.append('*' + args.vararg.arg)
            names.extend(a.arg for a in args.kwonlyargs)
            if args.kwarg:
                names.append('**' + args.kwarg.arg)
            qualified = node.name if scope == 'module' else scope + '.' + node.name
            result['functions'].append(dict(name=node.name, qualified_name=qualified,
                args=names, scope=scope, async_function=isinstance(node, ast.AsyncFunctionDef), **location))
            child_scope, child_depth = qualified, 0
        elif isinstance(node, ast.ClassDef):
            child_scope = node.name if scope == 'module' else scope + '.' + node.name
            child_depth = 0
        elif isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
            child_depth = depth + 1
            max_depth = max(max_depth, child_depth)
            uncertain |= isinstance(node, ast.While)
            result['loops'].append(dict(kind=type(node).__name__, scope=scope, **location))
        elif isinstance(node, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
            child_depth = depth + len(node.generators)
            max_depth = max(max_depth, child_depth)
        elif isinstance(node, (ast.If, ast.IfExp, ast.Match)):
            result['conditionals'].append(dict(kind=type(node).__name__, scope=scope, **location))
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            result['variables'].append(dict(name=node.id, scope=scope, line=node.lineno))
        elif isinstance(node, ast.arg):
            result['variables'].append(dict(name=node.arg, scope=scope, line=node.lineno, parameter=True))
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            result['imports'].append(dict(module=getattr(node, 'module', None),
                level=getattr(node, 'level', 0),
                names=[{'name': a.name, 'alias': a.asname} for a in node.names], **location))
        elif isinstance(node, ast.Call):
            # Calls may hide recursion or expensive library work.
            uncertain = True
        stack.extend((child, child_scope, child_depth) for child in reversed(list(ast.iter_child_nodes(node))))
    baseline = 'O(1)' if not max_depth else ('O(n)' if max_depth == 1 else f'O(n^{max_depth})')
    result['complexity'] = {
        'estimate': 'Unknown' if uncertain else baseline,
        'loop_nesting': max_depth,
        'loop_based_estimate': baseline,
        'confidence': 'heuristic',
        'note': 'Loop-depth illustration only, assuming each loop runs n times and each operation has constant cost. Calls, recursion, loop bounds, integer sizes and input-dependent behavior can change this. Not a verified runtime bound.'}
    return result
