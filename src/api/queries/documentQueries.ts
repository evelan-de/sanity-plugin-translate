export const documentQuery = `
*[_type == $type && _id == $id][0] {
 ...,
 "_translations": *[_type == "translation.metadata" && references(^._id)].translations[].value->{
    title,
  }
}
`;

export const documentComparisonQuery = `
*[_id == $id || _id == "drafts." + $id] {
 _updatedAt,
 _id
}
`;

export const translationQuery = `
*[_id == $id][0] {
  "_translations": *[_type == "translation.metadata" && references(^._id)].translations[].value->{
    _id,
    language,
  }
}
`;

export const documentVersionsQuery = `*[_type == "translation.metadata" && references($id)].translations[].value->{
  _id,
  language,
  _originalId
}
`;

export const documentVersionsFullQuery = `*[_type == "translation.metadata" && references($id)].translations[].value->{
  _id,
  ...,
}
`;
