import { getDestinations } from "../../utils/storage";
import { requireAuth } from "../../utils/helpers";
import type { S3Destination } from "../../../app/types";

function destinationWithoutCredentials(dest: S3Destination) {
  const { accessKeyId, secretAccessKey, ...rest } = dest
  return rest
}

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event);
  const allDestinations = await getDestinations();

  // Admin видит все destinations, остальные только те, где они в allowedUserIds
  const availableDestinations = allDestinations.filter((dest) => {
    if (auth.role === "admin") return true;
    return dest.allowedUserIds.includes(auth.userId);
  });

  return {
    destinations: availableDestinations.map(destinationWithoutCredentials),
  };
});
