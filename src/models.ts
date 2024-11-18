export interface SObject {
  attributes?: {
    type?: string;
    url?: string;
  };
  id?: string;
  Id?: string;
  [key: string]: unknown;
}

export type SResult = {
  id?: string;
  success?: true;
  errors?: SError[];
};

export type SError = {
  statusCode?: string;
  message?: string;
  fields?: string[];
};

export type SOptions = {
  allOrNone?: boolean;
  type?: string;
};
