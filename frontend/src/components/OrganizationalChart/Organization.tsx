import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Badge from "@mui/material/Badge";
import Tooltip from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import { EmployeeNode } from "../../types/employee";
import PersonIcon from "@mui/icons-material/Person";

type OrganizationProps = {
  org: EmployeeNode;
  onCollapse: () => void;
  collapsed: boolean;
  ref?: any;
};

const Organization = ({
  org,
  onCollapse,
  collapsed,
  ref,
}: OrganizationProps) => {
  const childCount = org.children?.length ?? 0;
  const connections = org.connections ?? 0;

  return (
    <Card
      className="inline-block min-w-[250px]"
      sx={{ borderRadius: "16px" }}
      variant="outlined"
      ref={ref}
    >
      <CardHeader
        className="text-left"
        avatar={
          <Tooltip title={`${connections} connections`} arrow>
            <Badge
              style={{ cursor: "pointer" }}
              color="secondary"
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              showZero
              invisible={!collapsed}
              overlap="circular"
              badgeContent={childCount > 0 ? childCount : null}
              onClick={onCollapse}
            >
              {org.image ? (
                <Avatar
                  alt={org.name}
                  src={org.image}
                  sx={{ width: 40, height: 40 }}
                />
              ) : (
                <Avatar
                  sx={{ backgroundColor: "#ECECF4", width: 40, height: 40 }}
                >
                  <PersonIcon color="primary" />
                </Avatar>
              )}
            </Badge>
          </Tooltip>
        }
        title={org.name}
        subheader={org.title}
      />
      {connections > 0 && (
        <ExpandButton
          className="justify-center"
          size="small"
          onClick={onCollapse}
          open={!collapsed}
        >
          <ExpandMoreIcon />
        </ExpandButton>
      )}
    </Card>
  );
};

const ExpandButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "open",
})<{ open?: boolean }>(({ theme, open }: any) => ({
  transform: open ? "rotate(180deg)" : "rotate(0deg)",
  marginTop: -10,
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.short,
  }),
}));

export default Organization;
