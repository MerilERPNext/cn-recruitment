import { useEffect, useRef, useState } from "react";
import { Tree, TreeNode } from "react-organizational-chart";
import Organization from "./Organization";
import { EmployeeNode } from "../../types/employee";

export interface Org {
  name: string;
  children?: Org[];
  connections?: number;
  collapsed?: boolean;
}

type NodeProps = {
  org: EmployeeNode;
  parent?: Org | undefined;
};

const Node = ({ org, parent }: NodeProps) => {
  const [collapsed, setCollapsed] = useState<boolean>(!!org.collapsed);
  const nodeRef = useRef<HTMLDivElement>(null);
  const handleCollapse = () => {
    setCollapsed((c) => !c);
    setTimeout(() => {
      nodeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        // inline: "center",
      });
    }, 0);
  };

  useEffect(() => {
    org.collapsed = collapsed;
  }, [collapsed, org]);

  // T is either TreeNode (for children) or Tree wrapper (for root)
  const T: any = parent
    ? TreeNode
    : (props: any) => (
        <Tree
          {...props}
          lineWidth={"3px"}
          lineColor={"#bbc"}
          lineBorderRadius={"12px"}
          nodePadding={"2px"}
        >
          {props.children}
        </Tree>
      );

  return collapsed ? (
    <T
      label={
        <Organization
          ref={nodeRef}
          org={org}
          onCollapse={handleCollapse}
          collapsed={collapsed}
        />
      }
    />
  ) : (
    <T
      label={
        <Organization
          ref={nodeRef}
          org={org}
          onCollapse={handleCollapse}
          collapsed={collapsed}
        />
      }
    >
      {(org.children || []).map((c, idx) => (
        <Node
          key={c.name ? `node-${c.name}` : `node-${idx}`}
          org={c}
          parent={org}
        />
      ))}
    </T>
  );
};

export default Node;
