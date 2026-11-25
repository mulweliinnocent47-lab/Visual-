import { Block } from '@/types/blocks';

interface BlockSettingsProps {
  block: Block;
  onUpdate: (id: string, updates: Partial<Block>) => void;
}

export default function BlockSettings({ block, onUpdate }: BlockSettingsProps) {
  const inputCls = "w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-secondary/50 outline-none focus:ring-1 focus:ring-primary transition-all";
  const smallInputCls = "w-14 text-xs px-1.5 py-1.5 rounded-lg border border-border bg-secondary/50 outline-none focus:ring-1 focus:ring-primary";
  const selectCls = "text-xs px-1.5 py-1.5 rounded-lg border border-border bg-secondary/50 outline-none";

  const setProp = (key: string, val: any) => onUpdate(block.id, { props: { ...block.props, [key]: val } });

  switch (block.type) {
    case 'button':
      return <input className={inputCls} value={block.props.text} onChange={e => setProp('text', e.target.value)} placeholder="Button text" />;
    case 'text':
      return <input className={inputCls} value={block.props.text} onChange={e => setProp('text', e.target.value)} placeholder="Text content" />;
    case 'input':
      return (
        <div className="space-y-1.5">
          <input className={inputCls} value={block.props.placeholder} onChange={e => setProp('placeholder', e.target.value)} placeholder="Placeholder" />
          <input className={inputCls} value={block.props.label || ''} onChange={e => setProp('label', e.target.value)} placeholder="Label" />
          <input className={inputCls} value={block.props.helperText || ''} onChange={e => setProp('helperText', e.target.value)} placeholder="Helper text" />
          <select className={selectCls} value={block.props.inputType || 'text'} onChange={e => setProp('inputType', e.target.value)}>
            <option value="text">Text</option><option value="email">Email</option><option value="password">Password</option>
            <option value="number">Number</option><option value="tel">Tel</option><option value="url">URL</option>
          </select>
          <div className="flex gap-1 items-center">
            <input className={smallInputCls} value={block.props.maxLength || ''} onChange={e => setProp('maxLength', e.target.value)} placeholder="Max" />
            <input className={smallInputCls} value={block.props.minLength || ''} onChange={e => setProp('minLength', e.target.value)} placeholder="Min" />
          </div>
          <input className={inputCls} value={block.props.validationRegex || ''} onChange={e => setProp('validationRegex', e.target.value)} placeholder="Regex validation" />
          <input className={inputCls} value={block.props.errorMessage || ''} onChange={e => setProp('errorMessage', e.target.value)} placeholder="Error message" />
          <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <input type="checkbox" checked={block.props.required || false} onChange={e => setProp('required', e.target.checked)} />Required
          </label>
        </div>
      );
    case 'display':
      return (
        <div className="space-y-1.5">
          <input className={inputCls} value={block.props.value} onChange={e => setProp('value', e.target.value)} placeholder="Initial value" />
          <select className={selectCls} value={block.props.format || ''} onChange={e => setProp('format', e.target.value)}>
            <option value="">None</option><option value="uppercase">UPPERCASE</option><option value="lowercase">lowercase</option>
            <option value="currency">Currency</option><option value="date">Date</option>
          </select>
          <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <input type="checkbox" checked={block.props.htmlRender || false} onChange={e => setProp('htmlRender', e.target.checked)} />HTML rendering
          </label>
        </div>
      );
    case 'image':
      return (
        <div className="space-y-1.5">
          <input className={inputCls} value={block.props.src} onChange={e => setProp('src', e.target.value)} placeholder="Image URL" />
          <input className={inputCls} value={block.props.alt} onChange={e => setProp('alt', e.target.value)} placeholder="Alt text" />
          <select className={selectCls} value={block.props.fit || 'cover'} onChange={e => setProp('fit', e.target.value)}>
            <option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Stretch</option>
          </select>
          <input className={inputCls} value={block.props.aspectRatio || ''} onChange={e => setProp('aspectRatio', e.target.value)} placeholder="Aspect ratio (16/9)" />
          <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <input type="checkbox" checked={block.props.lazyLoad || false} onChange={e => setProp('lazyLoad', e.target.checked)} />Lazy loading
          </label>
        </div>
      );
    case 'math':
      return (
        <div className="flex gap-1 items-center">
          <input className={smallInputCls} value={block.props.a} onChange={e => setProp('a', e.target.value)} />
          <select className={selectCls} value={block.props.op} onChange={e => setProp('op', e.target.value)}>
            <option>+</option><option>-</option><option>×</option><option>÷</option>
          </select>
          <input className={smallInputCls} value={block.props.b} onChange={e => setProp('b', e.target.value)} />
        </div>
      );
    case 'variable':
      return (
        <div className="space-y-1.5">
          <input className={inputCls} value={block.props.name} onChange={e => setProp('name', e.target.value)} placeholder="Variable name" />
          <input className={inputCls} value={block.props.value} onChange={e => setProp('value', e.target.value)} placeholder="Initial value" />
          <select className={selectCls} value={block.props.varType || 'text'} onChange={e => setProp('varType', e.target.value)}>
            <option value="text">Text</option><option value="number">Number</option><option value="boolean">Boolean</option>
          </select>
        </div>
      );
    case 'condition': case 'ifElse': case 'whileLoop':
      return (
        <div className="flex gap-1 items-center">
          <input className={smallInputCls} value={block.props.left} onChange={e => setProp('left', e.target.value)} />
          <select className={selectCls} value={block.props.op} onChange={e => setProp('op', e.target.value)}>
            <option>==</option><option>!=</option><option>&gt;</option><option>&lt;</option>
          </select>
          <input className={smallInputCls} value={block.props.right} onChange={e => setProp('right', e.target.value)} />
        </div>
      );
    case 'timer':
      return (<div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Delay:</span><input className={smallInputCls} type="number" value={block.props.delay} onChange={e => setProp('delay', parseInt(e.target.value) || 0)} /><span className="text-[10px] text-muted-foreground">ms</span></div>);
    case 'wait':
      return (<div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Wait:</span><input className={smallInputCls} type="number" value={block.props.seconds} onChange={e => setProp('seconds', parseFloat(e.target.value) || 1)} /><span className="text-[10px] text-muted-foreground">sec</span></div>);
    case 'alert':
      return <input className={inputCls} value={block.props.message} onChange={e => setProp('message', e.target.value)} placeholder="Alert message" />;
    case 'onStart': return <p className="text-[10px] text-muted-foreground">Connects run when app starts</p>;
    case 'repeat':
      return (<div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Times:</span><input className={smallInputCls} value={block.props.times} onChange={e => setProp('times', e.target.value)} /></div>);
    case 'forLoop':
      return (
        <div className="space-y-1.5">
          <div className="flex gap-1 items-center"><span className="text-[10px] text-muted-foreground w-8">var</span><input className={smallInputCls} value={block.props.varName || '_i'} onChange={e => setProp('varName', e.target.value)} /></div>
          <div className="flex gap-1 items-center">
            <input className={smallInputCls} value={block.props.start} onChange={e => setProp('start', e.target.value)} />
            <span className="text-[10px] text-muted-foreground">→</span>
            <input className={smallInputCls} value={block.props.end} onChange={e => setProp('end', e.target.value)} />
            <span className="text-[10px] text-muted-foreground">+</span>
            <input className={smallInputCls} value={block.props.step} onChange={e => setProp('step', e.target.value)} />
          </div>
        </div>
      );
    case 'listCreate':
      return <input className={inputCls} value={block.props.name} onChange={e => setProp('name', e.target.value)} placeholder="List name" />;
    case 'listAdd':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.listName} onChange={e => setProp('listName', e.target.value)} placeholder="List name" /><input className={inputCls} value={block.props.item} onChange={e => setProp('item', e.target.value)} placeholder="Item to add" /></div>);
    case 'listRemove': case 'listGet':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.listName} onChange={e => setProp('listName', e.target.value)} placeholder="List name" /><input className={inputCls} value={block.props.index} onChange={e => setProp('index', e.target.value)} placeholder="Index" /></div>);
    case 'functionDef':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.name} onChange={e => setProp('name', e.target.value)} placeholder="Function name" /><input className={inputCls} value={block.props.params || ''} onChange={e => setProp('params', e.target.value)} placeholder="Params (a, b, c)" /></div>);
    case 'functionCall':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.name} onChange={e => setProp('name', e.target.value)} placeholder="Function name" /><input className={inputCls} value={block.props.args || ''} onChange={e => setProp('args', e.target.value)} placeholder="Args (1, hello)" /></div>);
    case 'breakLoop': return <p className="text-[10px] text-muted-foreground">Breaks out of the current loop</p>;
    case 'continueLoop': return <p className="text-[10px] text-muted-foreground">Skips to the next iteration</p>;
    case 'stopExec': return <p className="text-[10px] text-muted-foreground">Stops all execution</p>;
    case 'screen':
      return <input className={inputCls} value={block.props.screenName} onChange={e => setProp('screenName', e.target.value)} placeholder="Screen name" />;
    case 'navigateTo':
      return <input className={inputCls} value={block.props.targetScreen} onChange={e => setProp('targetScreen', e.target.value)} placeholder="Target screen" />;
    case 'goBack': return <p className="text-[10px] text-muted-foreground">Navigate to previous screen</p>;
    case 'row': case 'column':
      return (<div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Gap:</span><input className={smallInputCls} value={block.props.gap} onChange={e => setProp('gap', e.target.value)} /><span className="text-[10px] text-muted-foreground">px</span></div>);
    case 'scrollView':
      return (<div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Height:</span><input className={smallInputCls} value={block.props.height} onChange={e => setProp('height', e.target.value)} /><span className="text-[10px] text-muted-foreground">px</span></div>);
    case 'apiRequest':
      return (
        <div className="space-y-1.5">
          <input className={inputCls} value={block.props.url} onChange={e => setProp('url', e.target.value)} placeholder="URL" />
          <select className={selectCls} value={block.props.method} onChange={e => setProp('method', e.target.value)}><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select>
          <input className={inputCls} value={block.props.resultVar} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" />
          <input className={inputCls} value={block.props.body || ''} onChange={e => setProp('body', e.target.value)} placeholder="Body (JSON)" />
        </div>
      );
    case 'localStorage':
      return (
        <div className="space-y-1.5">
          <select className={selectCls} value={block.props.action} onChange={e => setProp('action', e.target.value)}><option value="get">Load</option><option value="set">Save</option></select>
          <input className={inputCls} value={block.props.key} onChange={e => setProp('key', e.target.value)} placeholder="Key" />
          {block.props.action === 'set' && <input className={inputCls} value={block.props.value} onChange={e => setProp('value', e.target.value)} placeholder="Value" />}
          <input className={inputCls} value={block.props.resultVar} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" />
        </div>
      );
    case 'dynamicList':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.listName} onChange={e => setProp('listName', e.target.value)} placeholder="List variable" /><input className={inputCls} value={block.props.template} onChange={e => setProp('template', e.target.value)} placeholder="Template: {{item}}" /></div>);
    // V6 blocks
    case 'realtimeSubscribe':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.channel} onChange={e => setProp('channel', e.target.value)} placeholder="Channel name" /><input className={inputCls} value={block.props.event} onChange={e => setProp('event', e.target.value)} placeholder="Event name" /><input className={inputCls} value={block.props.resultVar} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" /></div>);
    case 'realtimePublish':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.channel} onChange={e => setProp('channel', e.target.value)} placeholder="Channel name" /><input className={inputCls} value={block.props.event} onChange={e => setProp('event', e.target.value)} placeholder="Event name" /><input className={inputCls} value={block.props.payload} onChange={e => setProp('payload', e.target.value)} placeholder="Payload (var or value)" /></div>);
    case 'presenceBlock':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.channel} onChange={e => setProp('channel', e.target.value)} placeholder="Channel name" /><input className={inputCls} value={block.props.statusVar} onChange={e => setProp('statusVar', e.target.value)} placeholder="Users variable" /></div>);
    case 'dbCreate':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.collection} onChange={e => setProp('collection', e.target.value)} placeholder="Collection name" /><input className={inputCls} value={block.props.data} onChange={e => setProp('data', e.target.value)} placeholder='Data JSON {"key":"val"}' /></div>);
    case 'dbRead':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.collection} onChange={e => setProp('collection', e.target.value)} placeholder="Collection" /><input className={inputCls} value={block.props.id} onChange={e => setProp('id', e.target.value)} placeholder="Record ID" /><input className={inputCls} value={block.props.resultVar} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" /></div>);
    case 'dbUpdate':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.collection} onChange={e => setProp('collection', e.target.value)} placeholder="Collection" /><input className={inputCls} value={block.props.id} onChange={e => setProp('id', e.target.value)} placeholder="Record ID" /><input className={inputCls} value={block.props.data} onChange={e => setProp('data', e.target.value)} placeholder="Update data JSON" /></div>);
    case 'dbDelete':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.collection} onChange={e => setProp('collection', e.target.value)} placeholder="Collection" /><input className={inputCls} value={block.props.id} onChange={e => setProp('id', e.target.value)} placeholder="Record ID" /></div>);
    case 'dbQuery':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.collection} onChange={e => setProp('collection', e.target.value)} placeholder="Collection" /><input className={inputCls} value={block.props.filter} onChange={e => setProp('filter', e.target.value)} placeholder="Filter (key=value)" /><input className={inputCls} value={block.props.orderBy} onChange={e => setProp('orderBy', e.target.value)} placeholder="Order by field" /><input className={smallInputCls} value={block.props.limit} onChange={e => setProp('limit', e.target.value)} placeholder="10" /><input className={inputCls} value={block.props.resultVar} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" /></div>);
    case 'globalState':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.name} onChange={e => setProp('name', e.target.value)} placeholder="State name" /><input className={inputCls} value={block.props.value} onChange={e => setProp('value', e.target.value)} placeholder="Initial value" /></div>);
    case 'reactiveVar':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.name} onChange={e => setProp('name', e.target.value)} placeholder="Variable name" /><input className={inputCls} value={block.props.value} onChange={e => setProp('value', e.target.value)} placeholder="Initial value" /><input className={inputCls} value={block.props.onChange || ''} onChange={e => setProp('onChange', e.target.value)} placeholder="On change (block ID)" /></div>);
    case 'componentDef':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.name} onChange={e => setProp('name', e.target.value)} placeholder="Component name" /><input className={inputCls} value={block.props.propsSchema || ''} onChange={e => setProp('propsSchema', e.target.value)} placeholder="Props (title, color)" /></div>);
    case 'componentUse':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.name} onChange={e => setProp('name', e.target.value)} placeholder="Component name" /><input className={inputCls} value={block.props.propsData || ''} onChange={e => setProp('propsData', e.target.value)} placeholder="Props data (JSON)" /></div>);
    case 'videoPlayer':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.src} onChange={e => setProp('src', e.target.value)} placeholder="Video URL" /><label className="flex items-center gap-2 text-[10px] text-muted-foreground"><input type="checkbox" checked={block.props.autoplay} onChange={e => setProp('autoplay', e.target.checked)} />Autoplay</label></div>);
    case 'audioPlayer':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.src} onChange={e => setProp('src', e.target.value)} placeholder="Audio URL" /><label className="flex items-center gap-2 text-[10px] text-muted-foreground"><input type="checkbox" checked={block.props.autoplay} onChange={e => setProp('autoplay', e.target.checked)} />Autoplay</label></div>);
    case 'fileUpload':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.accept} onChange={e => setProp('accept', e.target.value)} placeholder="Accept (image/*, .pdf)" /><input className={inputCls} value={block.props.resultVar} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" /><input className={smallInputCls} value={block.props.maxSize} onChange={e => setProp('maxSize', e.target.value)} placeholder="5" /></div>);
    case 'cameraBlock':
      return (<div className="space-y-1.5"><select className={selectCls} value={block.props.facing} onChange={e => setProp('facing', e.target.value)}><option value="user">Front</option><option value="environment">Back</option></select><input className={inputCls} value={block.props.resultVar} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" /></div>);
    case 'micBlock':
      return (<div className="space-y-1.5"><input className={smallInputCls} value={block.props.maxDuration} onChange={e => setProp('maxDuration', e.target.value)} placeholder="30" /><span className="text-[10px] text-muted-foreground">sec max</span><input className={inputCls} value={block.props.resultVar} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" /></div>);
    case 'animateBlock':
      return (
        <div className="space-y-1.5">
          <select className={selectCls} value={block.props.animation} onChange={e => setProp('animation', e.target.value)}>
            <option value="fadeIn">Fade In</option><option value="fadeOut">Fade Out</option><option value="slideUp">Slide Up</option><option value="slideDown">Slide Down</option><option value="scaleIn">Scale In</option><option value="bounce">Bounce</option><option value="shake">Shake</option>
          </select>
          <div className="flex gap-1 items-center"><span className="text-[10px] text-muted-foreground">Duration</span><input className={smallInputCls} value={block.props.duration} onChange={e => setProp('duration', e.target.value)} /><span className="text-[10px] text-muted-foreground">s</span></div>
        </div>
      );
    case 'onScrollAnim':
      return (<div className="space-y-1.5"><select className={selectCls} value={block.props.animation} onChange={e => setProp('animation', e.target.value)}><option value="slideUp">Slide Up</option><option value="fadeIn">Fade In</option><option value="scaleIn">Scale In</option></select><input className={smallInputCls} value={block.props.threshold} onChange={e => setProp('threshold', e.target.value)} placeholder="0.5" /></div>);
    case 'pageTransition':
      return (<div className="space-y-1.5"><select className={selectCls} value={block.props.type} onChange={e => setProp('type', e.target.value)}><option value="fade">Fade</option><option value="slide">Slide</option><option value="scale">Scale</option></select><input className={smallInputCls} value={block.props.duration} onChange={e => setProp('duration', e.target.value)} /></div>);
    case 'gestureBlock':
      return (<div className="space-y-1.5"><select className={selectCls} value={block.props.gesture} onChange={e => setProp('gesture', e.target.value)}><option value="swipeLeft">Swipe Left</option><option value="swipeRight">Swipe Right</option><option value="swipeUp">Swipe Up</option><option value="swipeDown">Swipe Down</option><option value="pinch">Pinch</option><option value="longPress">Long Press</option></select></div>);
    case 'permLocation': return <p className="text-[10px] text-muted-foreground">Requests GPS location → stores in variable</p>;
    case 'permCamera': return <p className="text-[10px] text-muted-foreground">Requests camera permission</p>;
    case 'permNotification': return <p className="text-[10px] text-muted-foreground">Requests notification permission</p>;
    case 'authLogin':
      return (
        <div className="space-y-1.5">
          <input className={inputCls} value={block.props.emailVar || ''} onChange={e => setProp('emailVar', e.target.value)} placeholder="Email input block ID" />
          <input className={inputCls} value={block.props.passwordVar || ''} onChange={e => setProp('passwordVar', e.target.value)} placeholder="Password input block ID" />
          <input className={inputCls} value={block.props.resultVar || ''} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" />
          <input className={inputCls} value={block.props.errorVar || ''} onChange={e => setProp('errorVar', e.target.value)} placeholder="Error variable" />
        </div>
      );
    case 'authRegister':
      return (
        <div className="space-y-1.5">
          <input className={inputCls} value={block.props.emailVar || ''} onChange={e => setProp('emailVar', e.target.value)} placeholder="Email input block ID" />
          <input className={inputCls} value={block.props.passwordVar || ''} onChange={e => setProp('passwordVar', e.target.value)} placeholder="Password input block ID" />
          <input className={inputCls} value={block.props.resultVar || ''} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" />
          <input className={inputCls} value={block.props.errorVar || ''} onChange={e => setProp('errorVar', e.target.value)} placeholder="Error variable" />
        </div>
      );
    case 'authLogout':
      return <p className="text-[10px] text-muted-foreground">Signs the current user out and clears the session</p>;
    case 'authForgotPassword':
      return (
        <div className="space-y-1.5">
          <input className={inputCls} value={block.props.emailVar || ''} onChange={e => setProp('emailVar', e.target.value)} placeholder="Email input block ID" />
          <input className={inputCls} value={block.props.resultVar || ''} onChange={e => setProp('resultVar', e.target.value)} placeholder="Result variable" />
          <input className={inputCls} value={block.props.errorVar || ''} onChange={e => setProp('errorVar', e.target.value)} placeholder="Error variable" />
        </div>
      );
    case 'authGuard':
      return (
        <div className="space-y-1.5">
          <input className={inputCls} value={block.props.userVar || ''} onChange={e => setProp('userVar', e.target.value)} placeholder="User variable" />
          <p className="text-[10px] text-muted-foreground">Connected blocks run only if user is logged in. Otherwise skipped.</p>
        </div>
      );
    case 'authSocialLogin':
      return (
        <div className="space-y-1.5">
          <select className={selectCls} value={block.props.provider || 'google'} onChange={e => setProp('provider', e.target.value)}>
            <option value="google">Google</option>
          </select>
          <input className={inputCls} value={block.props.errorVar || ''} onChange={e => setProp('errorVar', e.target.value)} placeholder="Error variable" />
        </div>
      );
    // Website blocks
    case 'navbar':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.brand || ''} onChange={e => setProp('brand', e.target.value)} placeholder="Brand name" /><input className={inputCls} value={block.props.links || ''} onChange={e => setProp('links', e.target.value)} placeholder="Links (Home,About,Contact)" /></div>);
    case 'hero':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.title || ''} onChange={e => setProp('title', e.target.value)} placeholder="Title" /><input className={inputCls} value={block.props.subtitle || ''} onChange={e => setProp('subtitle', e.target.value)} placeholder="Subtitle" /><input className={inputCls} value={block.props.ctaText || ''} onChange={e => setProp('ctaText', e.target.value)} placeholder="CTA button text" /></div>);
    case 'footer':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.text || ''} onChange={e => setProp('text', e.target.value)} placeholder="Footer text" /><input className={inputCls} value={block.props.links || ''} onChange={e => setProp('links', e.target.value)} placeholder="Links (Privacy,Terms)" /></div>);
    case 'cardGrid':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.listName || ''} onChange={e => setProp('listName', e.target.value)} placeholder="List variable name" /><input className={smallInputCls} value={block.props.columns || '2'} onChange={e => setProp('columns', e.target.value)} placeholder="2" /><span className="text-[10px] text-muted-foreground">columns</span></div>);
    case 'separator':
      return <p className="text-[10px] text-muted-foreground">A horizontal divider line</p>;
    case 'link':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.text || ''} onChange={e => setProp('text', e.target.value)} placeholder="Link text" /><input className={inputCls} value={block.props.url || ''} onChange={e => setProp('url', e.target.value)} placeholder="URL" /><select className={selectCls} value={block.props.target || '_blank'} onChange={e => setProp('target', e.target.value)}><option value="_blank">New tab</option><option value="_self">Same tab</option></select></div>);
    // Form blocks
    case 'selectDropdown':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.label || ''} onChange={e => setProp('label', e.target.value)} placeholder="Label" /><input className={inputCls} value={block.props.options || ''} onChange={e => setProp('options', e.target.value)} placeholder="Option 1,Option 2,Option 3" /><input className={inputCls} value={block.props.placeholder || ''} onChange={e => setProp('placeholder', e.target.value)} placeholder="Placeholder" /></div>);
    case 'checkbox':
      return <input className={inputCls} value={block.props.label || ''} onChange={e => setProp('label', e.target.value)} placeholder="Checkbox label" />;
    case 'textarea':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.label || ''} onChange={e => setProp('label', e.target.value)} placeholder="Label" /><input className={inputCls} value={block.props.placeholder || ''} onChange={e => setProp('placeholder', e.target.value)} placeholder="Placeholder" /><input className={smallInputCls} value={block.props.rows || '4'} onChange={e => setProp('rows', e.target.value)} placeholder="4" /><span className="text-[10px] text-muted-foreground">rows</span></div>);
    // UI extras
    case 'badge':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.text || ''} onChange={e => setProp('text', e.target.value)} placeholder="Badge text" /><select className={selectCls} value={block.props.variant || 'default'} onChange={e => setProp('variant', e.target.value)}><option value="default">Primary</option><option value="secondary">Secondary</option><option value="destructive">Destructive</option></select></div>);
    case 'avatar':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.name || ''} onChange={e => setProp('name', e.target.value)} placeholder="Name" /><input className={inputCls} value={block.props.src || ''} onChange={e => setProp('src', e.target.value)} placeholder="Image URL (optional)" /></div>);
    case 'progressBar':
      return (<div className="space-y-1.5"><input className={inputCls} value={block.props.label || ''} onChange={e => setProp('label', e.target.value)} placeholder="Label" /><input className={smallInputCls} value={block.props.value || '50'} onChange={e => setProp('value', e.target.value)} placeholder="50" /><span className="text-[10px] text-muted-foreground">%</span><input className={inputCls} value={block.props.valueVar || ''} onChange={e => setProp('valueVar', e.target.value)} placeholder="Variable name (optional)" /></div>);
    case 'tabsBlock':
      return <input className={inputCls} value={block.props.tabs || ''} onChange={e => setProp('tabs', e.target.value)} placeholder="Tab 1,Tab 2,Tab 3" />;
    // Custom code
    case 'customCode':
      return (
        <div className="space-y-1.5">
          <select className={selectCls} value={block.props.language || 'html'} onChange={e => setProp('language', e.target.value)}>
            <option value="html">HTML</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option><option value="css">CSS</option><option value="htmlcss">HTML + CSS</option>
          </select>
          <textarea className={`${inputCls} font-mono text-[11px] min-h-[100px]`} value={block.props.code || ''} onChange={e => setProp('code', e.target.value)} placeholder="Write your code here..." />
        </div>
      );
    default:
      return null;
  }
}
