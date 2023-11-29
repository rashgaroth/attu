export const ROOT_GRANTS = {
  Collection: { '*': { privileges: ['*'] } },
  Global: { '*': { privileges: ['*'] } },
  User: { '*': { privileges: ['*'] } },
};

export const PUBLIC_GRANTS = {
  Global: {
    '*': {
      privileges: ['DescribeCollection', 'ShowCollections', 'IndexDetail'],
    },
  },
};

export const ROOT_USER_NAME = 'root';
export const ROOT_ROLE = 'admin';
export const PUBLIC_ROLE = 'public';
