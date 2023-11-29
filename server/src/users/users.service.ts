import { MilvusService } from '../milvus/milvus.service';
import {
  CreateUserReq,
  UpdateUserReq,
  DeleteUserReq,
  CreateRoleReq,
  DropRoleReq,
  AddUserToRoleReq,
  RemoveUserFromRoleReq,
  HasRoleReq,
  listRoleReq,
  SelectUserReq,
  Privileges,
  GlobalPrivileges,
  CollectionPrivileges,
  UserPrivileges,
  RbacObjects,
  ListGrantsReq,
  OperateRolePrivilegeReq,
} from '@zilliz/milvus2-sdk-node';
import { throwErrorFromSDK } from '../utils/Error';
import { ObjectPrivileges } from './type';

export class UserService {
  constructor(private milvusService: MilvusService) {}

  async getUsers() {
    const res = await this.milvusService.client.listUsers();
    throwErrorFromSDK(res.status);

    return res;
  }

  async createUser(data: CreateUserReq) {
    const res = await this.milvusService.client.createUser(data);
    throwErrorFromSDK(res);

    return res;
  }

  async updateUser(data: UpdateUserReq) {
    const res = await this.milvusService.client.updateUser(data);
    throwErrorFromSDK(res);

    return res;
  }

  async deleteUser(data: DeleteUserReq) {
    const res = await this.milvusService.client.deleteUser(data);
    throwErrorFromSDK(res);
    return res;
  }

  async getRoles(data?: listRoleReq) {
    const res = await this.milvusService.client.listRoles(data);
    throwErrorFromSDK(res.status);

    return res;
  }

  async selectUser(data: SelectUserReq) {
    const res = await this.milvusService.client.selectUser(data);
    throwErrorFromSDK(res.status);

    return res;
  }

  async createRole(data: CreateRoleReq) {
    const res = await this.milvusService.client.createRole(data);
    throwErrorFromSDK(res);

    return res;
  }

  async deleteRole(data: DropRoleReq) {
    const res = await this.milvusService.client.dropRole(data);
    throwErrorFromSDK(res);
    return res;
  }

  async assignUserRole(data: AddUserToRoleReq) {
    const res = await this.milvusService.client.addUserToRole(data);
    throwErrorFromSDK(res);
    return res;
  }

  async unassignUserRole(data: RemoveUserFromRoleReq) {
    const res = await this.milvusService.client.removeUserFromRole(data);
    throwErrorFromSDK(res);
    return res;
  }

  async hasRole(data: HasRoleReq) {
    const res = await this.milvusService.client.hasRole(data);
    throwErrorFromSDK(res.status);
    return res;
  }

  async getRBAC() {
    return {
      Privileges,
      GlobalPrivileges,
      CollectionPrivileges,
      UserPrivileges,
      RbacObjects,
    };
  }

  async listGrants(data: ListGrantsReq) {
    const res = await this.milvusService.client.listGrants(data);
    throwErrorFromSDK(res.status);
    return res;
  }

  async grantRolePrivilege(data: OperateRolePrivilegeReq) {
    const res = await this.milvusService.client.grantRolePrivilege(data);
    throwErrorFromSDK(res);
    return res;
  }

  async revokeRolePrivilege(data: OperateRolePrivilegeReq) {
    const res = await this.milvusService.client.revokeRolePrivilege(data);
    throwErrorFromSDK(res);
    return res;
  }

  /**
   * This method is used to get the roles and their associated grants.
   * It first fetches all the roles, then gets the grants associated with each role.
   * The grants are then added to the corresponding role object.
   * If a roles array is provided in the data parameter, it filters the results to only include the specified roles.
   *
   * @param {Object} [data] - An optional object containing an array of role names.
   * @param {string[]} [data.roles] - An optional array of role names to filter the results.
   *
   * @returns {Promise<Object>} A promise that resolves to an object containing the roles and their associated grants.
   * The object has the following structure:
   * {
   *   results: [
   *     {
   *       role: { name: 'roleName', ... },
   *       entities: [
   *         { grantor: { privilege: { name: 'privilegeName', ... } }, ... },
   *         ...
   *       ]
   *     },
   *     ...
   *   ]
   * }
   */
  async getRolesGrants(data?: { roles: string[] }) {
    const result = await this.getRoles();

    const entitiesPromises = result.results.map(async role => {
      const { entities } = await this.listGrants({ roleName: role.role.name });
      return { ...role, entities };
    });

    result.results = await Promise.all(entitiesPromises);

    if (data && data.roles.length) {
      result.results = result.results.filter(r =>
        data.roles.includes(r.role.name)
      );
    }

    console.dir(result.results, { depth: null });

    return result;
  }

  /**
   * This method is used to list the privileges granted to a user.
   * It first fetches the roles of the user, then gets the privileges associated with those roles.
   * The privileges are then restructured into an object where the keys are the object names and the values are the privileges.
   *
   * @param {Object} data - An object containing the username of the user.
   * @param {string} data.username - The username of the user.
   *
   * @returns {Promise<ObjectPrivileges>} A promise that resolves to an object containing the privileges of the user.
   * The object has the following structure:
   * {
   *   Collection: { '*': { privileges: [ 'GetStatistics', 'Load' ] } },
   *   Global: { '*': { privileges: [ '*' ] } }
   * }
   */
  async listUserGrants(data: { username: string }): Promise<ObjectPrivileges> {
    // get user roles
    const { results } = await this.selectUser({
      username: data.username,
      includeRoleInfo: true,
    });

    // extract roles
    const roles = results.flatMap(r => r.roles.map(role => role.name));
    // get roles grants
    const res = await this.getRolesGrants({ roles });
    // extract privileges
    const entities = res.results.flatMap(result => result.entities);

    // re-org data strcture
    const result = entities.reduce((acc, entity) => {
      if (!acc[entity.object.name]) {
        acc[entity.object.name] = {};
      }
      if (!acc[entity.object.name][entity.object_name]) {
        acc[entity.object.name][entity.object_name] = { privileges: [] };
      }
      acc[entity.object.name][entity.object_name].privileges.push(
        entity.grantor.privilege.name
      );
      return acc;
    }, {} as ObjectPrivileges);

    return result;
  }

  /**
   * This method is used to revoke all privileges from a role.
   * It first fetches the existing privileges of the role, then revokes each privilege one by one.
   *
   * @param {Object} data - An object containing the name of the role.
   * @param {string} data.roleName - The name of the role.
   *
   * @returns {Promise<void>} A promise that resolves when all privileges have been revoked.
   */
  async revokeAllRolePrivileges(data: { roleName: string }) {
    // get existing privileges
    const existingPrivileges = await this.listGrants({
      roleName: data.roleName,
    });

    // revoke all
    for (let i = 0; i < existingPrivileges.entities.length; i++) {
      const res = existingPrivileges.entities[i];
      await this.revokeRolePrivilege({
        object: res.object.name,
        objectName: res.object_name,
        privilegeName: res.grantor.privilege.name,
        roleName: res.role.name,
      });
    }
  }
}
