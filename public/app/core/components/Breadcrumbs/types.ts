import { NavModelItem } from '@grafana/data';
import { IconName } from '@grafana/ui';

interface TextBreadcrumb {
  text: string;
  href: string;
  navItem: NavModelItem;
}

interface IconBreadcrumb extends TextBreadcrumb {
  icon: IconName;
}

export type Breadcrumb = TextBreadcrumb | IconBreadcrumb;
