'use client';

import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  Separator,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

export default function MarkdownEditorInner({
  id,
  value,
  onChange,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border bg-background [&_.mdxeditor]:min-h-48">
      <MDXEditor
        markdown={value}
        onChange={onChange}
        contentEditableClassName="prose prose-sm max-w-none min-h-40 px-3 py-2"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <ListsToggle />
                <CreateLink />
                <InsertImage />
                <InsertTable />
              </>
            ),
          }),
        ]}
      />
      <textarea
        id={id}
        className="sr-only"
        value={value}
        readOnly
        aria-describedby={describedBy}
        tabIndex={-1}
      />
    </div>
  );
}
