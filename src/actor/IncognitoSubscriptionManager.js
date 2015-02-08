
import AbstractActor from "./AbstractActor";

export default class IncognitoSubscriptionManager extends AbstractActor {
  async onIncognito_subscriptionsAdd_requested(event: string, data: Object) {
    console.log(event, data);
    throw new Error("yo, man!");
    return {
      done: "yes, brah"
    };
  }
}
